/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from "react";
import { debugLog, debugError } from "@/utils/debugLogger";
import { useStoryQuestion } from "@/hooks/story-question";
import { useAIGeneration } from "@/hooks/useAIGeneration";
import { validateDesignPhasePrerequisites, PhaseValidationResult } from "@/services/validation/phaseValidationService";
import { toast } from "@/components/ui/use-toast";

import { useProject } from "@/contexts/ProjectContext";
import { prepareProjectContext } from "@/utils/project-context/prepareProjectContext";
import { Project } from "@/types/project";

interface StoryQuestionContextType {
  projectId: string;
  savedQuestion: string | Record<string, string> | null;
  currentQuestion: string | Record<string, string> | null;
  isLoading: boolean;
  isEditing: boolean;
  hasEverSavedQuestion: boolean;
  error: string | null;
  setIsEditing: (isEditing: boolean) => void;
  handleSaveQuestion: (question: string | Record<string, string>) => Promise<boolean>;
  aiResponse: string;
  isGenerating: boolean;
  generationError: string | null;
  handleGeneration: (e: React.MouseEvent) => void;
  validationResult: PhaseValidationResult | null;
}

const StoryQuestionContext = createContext<StoryQuestionContextType | undefined>(undefined);

interface StoryQuestionProviderProps {
  children: React.ReactNode;
  projectId: string;
  projectContext?: string;
}

export const StoryQuestionProvider: React.FC<StoryQuestionProviderProps> = ({
  children,
  projectId
}) => {
  const { activeProject } = useProject();
  // Keep a local refresh counter to force refetches

  const [validationResult, setValidationResult] = useState<PhaseValidationResult | null>(null);

  // Use the story question hook to manage state
  const {
    savedQuestion,
    currentQuestion,
    isLoading,
    isEditing,
    hasEverSavedQuestion,
    error,
    setIsEditing,
    handleSaveQuestion
  } = useStoryQuestion(projectId);

  // Use AI generation for story questions
  const {
    response: aiResponse,
    isLoading: isGenerating,
    error: generationError,
    generateResponse
  } = useAIGeneration(projectId);

  // Handler for generating a story question
  const handleGeneration = async (e: React.MouseEvent) => {
    e.preventDefault();

    // First validate prerequisites
    debugLog("Validating story question prerequisites for project:", projectId);
    const validation = await validateDesignPhasePrerequisites(projectId);
    setValidationResult(validation);

    if (!validation.isValid) {
      debugLog("Prerequisites not met for story question generation");
      toast({
        title: "Prerequisites Required",
        description: "Please complete the Context and Define phases before generating AI story questions.",
        variant: "warning",
      });
      return;
    }

    const projectToUse: Project = (activeProject && activeProject.id === projectId)
      ? activeProject
      : ({ id: projectId, name: `Project ${projectId}` } as Project);

    const projectName = projectToUse.name || "Project";
    const prompt = `Suggest a story question that is specific to the project "${projectName}" based on the project goals and focus`;

    debugLog("Preparing project context for story question AI generation");
    const contextData = await prepareProjectContext(projectToUse);
    const context = contextData?.context || "";

    await generateResponse(prompt, context, {
      promptKey: "story_question_prompt",
      promptVariables: { projectName }
    });
  };

  // Force refresh when story question is saved
  const enhancedSaveQuestion = async (question: string | Record<string, string>): Promise<boolean> => {
    if (!handleSaveQuestion) return false;
    const success = (await handleSaveQuestion(question)) as unknown as boolean;
    if (success) {


      // Dispatch event for other components
      try {
        window.dispatchEvent(new CustomEvent('story_question_saved', {
          detail: { projectId, question }
        }));
      } catch (eventError) {
        debugError("Error dispatching story_question_saved event:", eventError);
      }
    }
    return success;
  };

  // Listen for storage events that might indicate a story question was saved
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (
        e.key.startsWith('cerne_story_question_') ||
        e.key === `${projectId}_story_question` ||
        e.key === `story_question_last_save`
      )) {
        debugLog("Story question change detected in localStorage, refreshing");
      }
    };

    const handleQuestionSaved = () => {};

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('story_question_saved', handleQuestionSaved);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('story_question_saved', handleQuestionSaved);
    };
  }, [projectId]);

  const contextValue: StoryQuestionContextType = {
    projectId,
    savedQuestion,
    currentQuestion,
    isLoading,
    isEditing,
    hasEverSavedQuestion,
    error,
    setIsEditing,
    handleSaveQuestion: enhancedSaveQuestion,
    aiResponse,
    isGenerating,
    generationError,
    handleGeneration: (e) => { void handleGeneration(e); },
    validationResult
  };

  return (
    <StoryQuestionContext.Provider value={contextValue}>
      {children}
    </StoryQuestionContext.Provider>
  );
};

export const useStoryQuestionContext = () => {
  const context = useContext(StoryQuestionContext);
  if (context === undefined) {
    throw new Error("useStoryQuestionContext must be used within a StoryQuestionProvider");
  }
  return context;
};
