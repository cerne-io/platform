import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, Sparkles, Loader2, ExternalLink, ArrowRight, BookOpen, PenTool, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { useToast } from "@/components/ui/use-toast";
import { useStoriesQuery } from "@/hooks/queries/useStoriesQuery";
import { useInvalidateDesign } from "@/hooks/mutations/useInvalidateDesign";
import { useInfluencingFactors } from "@/services/factors/useInfluencingFactors";
import { QuestionType, getQuestionType, saveQuestionType } from "@/services/formConfig/questionTypeService";
import { prepareProjectContext } from "@/utils/project-context/prepareProjectContext";
import { aiAssistantService } from "@/services/aiAssistantService";
import { saveStoryQuestionWithSync } from "@/services/sync/storyQuestionSyncService";
import { generateWithAI } from "@/hooks/slider-questions/sliderQuestionAIGenerator";
import { saveSliderQuestionsWithSync } from "@/services/sync/sliderQuestionsSyncService";
import { generateTriangleQuestionsWithAI } from "@/hooks/triangle-questions/modules/aiGenerator";
import { saveTriangleQuestionsWithSync } from "@/services/sync/triangleQuestionsSyncService";
import { generateParticipantQuestionsWithAI } from "@/services/ai/participantQuestionGenerator";
import { saveParticipantQuestionsWithSync } from "@/services/sync/participantQuestionsSyncService";
import { STORAGE_KEYS } from "@/services/constants/storageKeys";
import { debugLog, debugError } from "@/utils/debugLogger";
import { saveActivityResponse } from "@/services/supabaseSync/operations/save/saveActivityResponse";
import { formLanguageService } from "@/services/formLanguageService";
import { detectSupportedLanguage } from "@/utils/languageDetection";
import { getStoryPlaceholder } from "@/utils/formDefaultTranslations";
import { CerneBuilderQuestion, createDefaultQuestion } from "../form-builder/types";
import { processGeneratedQuestion } from "../improver/questionUtils";
import { sliderQuestionsQueryKey } from "@/hooks/queries/useSliderQuestionsQuery";
import { participantQuestionsQueryKey } from "@/hooks/queries/useParticipantQuestionsQuery";
import { SliderQuestion, TriangleQuestion, ParticipantQuestion } from "@/services/types/designTypes";

interface CreateFormActionProps {
  projectId?: string;
  hasContext?: boolean;
  className?: string;
  onNavigate?: () => void;
}

export const CreateFormAction: React.FC<CreateFormActionProps> = ({
  projectId: propProjectId,
  hasContext = true,
  className,
  onNavigate,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeProject } = useProject();
  const projectId = propProjectId || activeProject?.id || "";
  const invalidateDesign = useInvalidateDesign();
  const { data: stories = [] } = useStoriesQuery();
  const hasStories = stories.length > 0;
  const { getInfluencingFactors } = useInfluencingFactors(projectId);

  const [questionType, setQuestionType] = useState<QuestionType>("slider");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showNoContextDialog, setShowNoContextDialog] = useState(false);
  const [showAiFailedDialog, setShowAiFailedDialog] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  // Load existing question type for this project if set
  useEffect(() => {
    if (!projectId) return;
    void getQuestionType(projectId).then((saved) => {
      if (saved) setQuestionType(saved);
    });
  }, [projectId]);

  const handleActionWithConfirmation = (action: () => void | Promise<void>) => {
    if (hasStories) {
      setIsAlertOpen(true);
    } else {
      void action();
    }
  };

  const handleCreateFormClick = () => {
    if (!hasContext) {
      setShowNoContextDialog(true);
      return;
    }
    handleActionWithConfirmation(executeCreateForm);
  };

  const executeCreateForm = async () => {
    if (!projectId || !activeProject) {
      toast({
        title: "Error",
        description: "No active project found.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationStep("Preparing project context...");
    toast({
      title: "Creating your form",
      description: "AI is generating questions based on your context & framing...",
    });

    try {
      // 1. Save chosen QuestionType
      await saveQuestionType(projectId, questionType);

      // 2. Prepare project context for AI
      const contextData = await prepareProjectContext(activeProject);
      const context = contextData?.context || "";

      // 3. Dispatch AI generation calls concurrently
      setGenerationStep("Generating questions with AI...");
      debugLog("CreateFormAction: Dispatching AI question generation in parallel");

      const storyQuestionPromise = aiAssistantService.callAssistant({
        prompt: `Suggest a story question that is specific to the project "${activeProject.name}" based on the project goals and focus`,
        projectContext: context,
        mode: "storyQuestion",
        promptKey: "story_question_prompt",
        promptVariables: { projectName: activeProject.name || "Project" },
      });

      const slidersPromise = (questionType === "slider" || questionType === "both")
        ? getInfluencingFactors().then((factors) =>
            generateWithAI(
              factors && factors.length > 0 ? factors : ["General experience"],
              activeProject
            )
          )
        : Promise.resolve<SliderQuestion[] | null>(null);

      const trianglesPromise = (questionType === "triangle" || questionType === "both")
        ? generateTriangleQuestionsWithAI(activeProject)
        : Promise.resolve<TriangleQuestion[] | null>(null);

      const participantQuestionsPromise = generateParticipantQuestionsWithAI(activeProject);

      const [storyResult, slidersResult, trianglesResult, participantResult] = await Promise.all([
        storyQuestionPromise,
        slidersPromise,
        trianglesPromise,
        participantQuestionsPromise,
      ]);

      // 4. Validate Story Question
      let finalStoryQuestion = "";
      if (storyResult?.response) {
        const processed = processGeneratedQuestion(storyResult.response);
        if (processed && processed.trim().length > 3) {
          finalStoryQuestion = processed.trim();
        }
      }
      if (!finalStoryQuestion) {
        throw new Error("AI could not generate the story question.");
      }

      // 5. Validate Sliders
      let generatedSliders: SliderQuestion[] = [];
      if (questionType === "slider" || questionType === "both") {
        if (!slidersResult || slidersResult.length === 0) {
          throw new Error("AI could not generate slider questions.");
        }
        generatedSliders = slidersResult.slice(0, 3);
      }

      // 6. Validate Triangles
      let generatedTriangles: TriangleQuestion[] = [];
      if (questionType === "triangle" || questionType === "both") {
        if (!trianglesResult || trianglesResult.length === 0) {
          throw new Error("AI could not generate triangle questions.");
        }
        generatedTriangles = trianglesResult.slice(0, 3);
      }

      // 7. Validate Participant Questions
      if (!participantResult || participantResult.length === 0) {
        throw new Error("AI could not generate participant questions.");
      }
      const participantQuestions = participantResult.slice(0, 3);

      // 8. Assemble questions for Form Builder
      setGenerationStep("Populating Form Builder...");
      const formLang = detectSupportedLanguage(`${context} ${finalStoryQuestion}`);
      const emotionalResponseQuestion = createDefaultQuestion("emotional-response", false, formLang);

      const builderQuestions: CerneBuilderQuestion[] = [];

      // 1) Story Question
      builderQuestions.push({
        id: "story-question-1",
        type: "story-question",
        label: finalStoryQuestion,
        placeholder: getStoryPlaceholder(formLang),
        required: true,
      });

      // 2) Default Emotional Response
      builderQuestions.push(emotionalResponseQuestion);

      // 3) Sliders (3 questions)
      if (questionType === "slider" || questionType === "both") {
        generatedSliders.forEach((s, idx) => {
          builderQuestions.push({
            id: `slider-${s.id || idx + 1}`,
            type: "slider",
            label: s.question,
            theme: s.theme || `Dimension ${idx + 1}`,
            required: true,
            sliderConfig: {
              leftLabel: s.leftLabel || "Low",
              rightLabel: s.rightLabel || "High",
              min: 0,
              max: 100,
              step: 1,
              defaultValue: s.sliderValue ?? 50,
            },
          });
        });
      }

      // 4) Triangles (3 questions)
      if (questionType === "triangle" || questionType === "both") {
        generatedTriangles.forEach((t, idx) => {
          builderQuestions.push({
            id: `triangle-${t.id || idx + 1}`,
            type: "triangle",
            label: t.question,
            theme: t.theme || `Balance ${idx + 1}`,
            required: true,
            triangleConfig: {
              topLabel: t.topLabel || "Top",
              bottomLeftLabel: t.bottomLeftLabel || "Bottom Left",
              bottomRightLabel: t.bottomRightLabel || "Bottom Right",
              defaultX: t.defaultX ?? 50,
              defaultY: t.defaultY ?? 66.67,
            },
          });
        });
      }

      // 5) Participant Questions (2 or 3)
      participantQuestions.forEach((pq, idx) => {
        builderQuestions.push({
          id: pq.id || `participant-${idx + 1}`,
          type: "participant-questions",
          label: pq.label,
          required: false,
          includePreferNotToSay: true,
          options: (pq.choices || []).map((c) => ({
            id: c.id,
            label: c.label,
          })).filter((c) => c.id !== "prefer-not-to-say"),
        });
      });

      // 9. Save all domain data to Supabase sync services
      await saveStoryQuestionWithSync(projectId, finalStoryQuestion);
      await saveActivityResponse(projectId, "design", "story-question", "story-questions", {
        story_question: finalStoryQuestion,
      });
      localStorage.setItem(STORAGE_KEYS.STORY_QUESTION_SAVED(projectId), "true");

      if (generatedSliders.length > 0) {
        await saveSliderQuestionsWithSync(projectId, generatedSliders);
        localStorage.setItem(STORAGE_KEYS.SLIDER_THEMES_SAVED(projectId), "true");
      }

      if (generatedTriangles.length > 0) {
        await saveTriangleQuestionsWithSync(generatedTriangles, projectId);
        localStorage.setItem(STORAGE_KEYS.TRIANGLE_QUESTIONS_SAVED(projectId), "true");
      }

      const syncParticipantQuestions: ParticipantQuestion[] = participantQuestions.map((pq, idx) => ({
        id: pq.id || `participant-${idx + 1}`,
        label: pq.label,
        questionType: "multiple-choice" as const,
        includePreferNotToSay: true,
        choices: (pq.choices || []).map((c) => ({
          id: c.id,
          label: c.label,
        })),
      }));

      await saveParticipantQuestionsWithSync(projectId, syncParticipantQuestions, true);
      localStorage.setItem(STORAGE_KEYS.PARTICIPANT_QUESTIONS_SAVED(projectId), "true");

      // Save Form Builder canvas layout
      await saveActivityResponse(projectId, "design", "form-builder", "form-builder-questions", builderQuestions);

      // Persist form language (defaults to 'en' if unsupported)
      await formLanguageService.saveLanguageConfig(projectId, {
        enabledLanguages: [formLang],
        defaultLanguage: formLang,
      });

      // 10. Refresh design completion states and query caches
      invalidateDesign(projectId);
      void queryClient.invalidateQueries({ queryKey: ['project-languages', projectId] });
      void queryClient.invalidateQueries({ queryKey: sliderQuestionsQueryKey(projectId, false) });
      void queryClient.invalidateQueries({ queryKey: sliderQuestionsQueryKey(projectId, true) });
      void queryClient.invalidateQueries({ queryKey: participantQuestionsQueryKey(projectId) });

      // Dispatch event for any mounted FormBuilderStudio instances
      try {
        window.dispatchEvent(
          new CustomEvent("form_builder_questions_updated", {
            detail: { projectId, questions: builderQuestions },
          })
        );
      } catch {
        // Window event fallback
      }

      // 11. Open success dialog
      setShowSuccessDialog(true);
    } catch (err) {
      debugError("Error in executeCreateForm:", err);
      toast({
        title: "AI Generation Failed",
        description: "AI could not generate the content at this time. Please try again later or enter it manually.",
        variant: "destructive",
      });
      setShowAiFailedDialog(true);
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  const getFormatLabel = () => {
    switch (questionType) {
      case "slider":
        return "Sliders";
      case "triangle":
        return "Triangles";
      case "both":
        return "Both";
      default:
        return "Sliders";
    }
  };

  return (
    <>
      <div className={cn("inline-flex rounded-md shadow-sm", className)}>
        <Button
          onClick={handleCreateFormClick}
          disabled={isGenerating}
          className="flex-1 flex items-center justify-center gap-2 rounded-r-none bg-[#5D3FD3] hover:bg-[#4D32B8] text-white text-xs font-medium h-9 px-3"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              <span className="truncate">{generationStep || "Creating form..."}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Create form ({getFormatLabel()})</span>
            </>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={isGenerating}
              className="px-2 rounded-l-none border-l border-white/20 bg-[#5D3FD3] hover:bg-[#4D32B8] text-white shrink-0 h-9"
              aria-label="Select question type"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuRadioGroup
              value={questionType}
              onValueChange={(val) => {
                const nextType = val as QuestionType;
                setQuestionType(nextType);
                if (projectId) {
                  void saveQuestionType(projectId, nextType);
                }
              }}
            >
              <DropdownMenuRadioItem value="slider" className="cursor-pointer">
                <div>
                  <div className="font-medium">Sliders</div>
                  <div className="text-xs text-muted-foreground">Continuous two-pole spectrum</div>
                </div>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="triangle" className="cursor-pointer">
                <div>
                  <div className="font-medium">Triangles</div>
                  <div className="text-xs text-muted-foreground">Three-corner balance</div>
                </div>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="both" className="cursor-pointer">
                <div>
                  <div className="font-medium">Both</div>
                  <div className="text-xs text-muted-foreground">Sliders and Triangles</div>
                </div>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Confirmation when existing stories present */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Form Questions?</AlertDialogTitle>
            <AlertDialogDescription>
              You have already collected responses for this project. Creating a new form will overwrite existing questions. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsAlertOpen(false);
                void executeCreateForm();
              }}
            >
              Yes, Create Form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-[#5D3FD3] dark:text-[#9D7CFF]" />
              Form Created
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-700 dark:text-gray-300 pt-3 leading-relaxed">
              Use AI-generated content as a suggestion. Make sure participant responses maintain anonymity.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-4 border-t border-gray-100 dark:border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowSuccessDialog(false);
                onNavigate?.();
                navigate("/design?step=form-builder");
              }}
              className="flex items-center gap-1.5"
            >
              <span>Review in Form Builder</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowSuccessDialog(false);
                onNavigate?.();
                navigate("/form");
              }}
              className="flex items-center gap-1.5 bg-[#5D3FD3] hover:bg-[#4D32B8] text-white"
            >
              <span>See Generated Form</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog when project has no context */}
      <Dialog open={showNoContextDialog} onOpenChange={setShowNoContextDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-[#5D3FD3] dark:text-[#9D7CFF]" />
              Project Context Needed
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-2 leading-relaxed">
              To generate questions with AI, Cerne needs information about your project. Would you like to answer the Context &amp; Framing questions, or enter your form questions manually?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShowNoContextDialog(false);
                onNavigate?.();
                navigate("/design?step=form-builder");
              }}
              className="flex items-center justify-center gap-2"
            >
              <PenTool className="h-4 w-4" />
              <span>Enter Info Manually</span>
            </Button>
            <Button
              onClick={() => {
                setShowNoContextDialog(false);
                onNavigate?.();
                navigate("/design?step=organization");
              }}
              className="flex items-center justify-center gap-2 bg-[#5D3FD3] hover:bg-[#4D32B8] text-white"
            >
              <BookOpen className="h-4 w-4" />
              <span>Answer the Questions</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog when AI generation fails */}
      <Dialog open={showAiFailedDialog} onOpenChange={setShowAiFailedDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-destructive" />
              AI Generation Unavailable
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-2 leading-relaxed">
              AI could not generate the content at this time. Please try again later or enter your questions manually in Form Builder.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShowAiFailedDialog(false);
                onNavigate?.();
                navigate("/design?step=form-builder");
              }}
              className="flex items-center justify-center gap-2"
            >
              <PenTool className="h-4 w-4" />
              <span>Enter Manually</span>
            </Button>
            <Button
              onClick={() => {
                setShowAiFailedDialog(false);
                void executeCreateForm();
              }}
              className="flex items-center justify-center gap-2 bg-[#5D3FD3] hover:bg-[#4D32B8] text-white"
            >
              <Sparkles className="h-4 w-4" />
              <span>Try Again</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateFormAction;
