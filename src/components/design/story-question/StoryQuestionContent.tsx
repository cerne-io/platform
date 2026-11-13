import { debugError } from "@/utils/debugLogger";
import React from "react";
import { useStoryQuestionContext } from "./StoryQuestionContext";
import StoryQuestionEditor from "../StoryQuestionEditor";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { toast } from "@/components/ui/use-toast";
import { useErrorHandler } from "@/utils/errorHandling";
import { PhasePrerequisitesWarning } from "@/components/design/shared/PhasePrerequisitesWarning";

import { debugLog } from "@/utils/debugLogger";
import { useInvalidateDesign } from "@/hooks/mutations/useInvalidateDesign";
import { useStoriesQuery } from "@/hooks/queries/useStoriesQuery";
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
import { useState, useEffect } from "react";
import LanguageTabs from "@/components/design/shared/LanguageTabs";
import { formLanguageService, ProjectLanguages, DEFAULT_LANGUAGES } from "@/services/formLanguageService";
import { getQuestionDisplayData } from "./useStoryQuestionDisplay";

const StoryQuestionContent: React.FC = () => {
  const {
    projectId,
    savedQuestion,
    currentQuestion,
    isLoading,
    isEditing,
    hasEverSavedQuestion,
    error,
    setIsEditing,
    handleSaveQuestion,
    handleGeneration,
    aiResponse,
    isGenerating,
    generationError,
    validationResult
  } = useStoryQuestionContext();

  const [isManualEditMode, setIsManualEditMode] = React.useState(false);

  const { wrapHandler } = useErrorHandler("StoryQuestionContent");
  const invalidateDesign = useInvalidateDesign();
  const { data: stories = [] } = useStoriesQuery();
  const hasStories = stories.length > 0;

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const [langConfig, setLangConfig] = useState<ProjectLanguages>(DEFAULT_LANGUAGES);
  const [activeLang, setActiveLang] = useState<string>('en');
  const [isLangsLoading, setIsLangsLoading] = useState(true);

  const { currentUserProjectRole } = useProject();
  const isReadOnly = currentUserProjectRole === 'viewer';

  useEffect(() => {
    const loadLangs = async () => {
      if (!projectId) {
        setIsLangsLoading(false);
        return;
      }
      try {
        const config = await formLanguageService.getLanguageConfig(projectId);
        setLangConfig(config);
        setActiveLang(config.defaultLanguage || 'en');
      } catch (error) {
        debugError("[StoryQuestionContent] Error loading languages:", error);
      } finally {
        setIsLangsLoading(false);
      }
    };
    void loadLangs();
  }, [projectId]);

  const handleActionWithConfirmation = (action: () => void) => {
    if (hasStories) {
      setPendingAction(() => action);
      setIsAlertOpen(true);
    } else {
      action();
    }
  };

  const confirmAction = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setIsAlertOpen(false);
  };

  const handleEditClick = wrapHandler(() => {
    handleActionWithConfirmation(() => setIsEditing(true));
  });

  const handleSaveQuestionWrapped = wrapHandler(async (question: string) => {
    await handleSaveQuestion(question);
    invalidateDesign(projectId);
    setIsEditing(false);
    setIsManualEditMode(false);
  });

  const handleAcceptImprovement = wrapHandler((improvedQuestion: string, savedToDb?: boolean) => {
    if (savedToDb) {
      debugLog("Question already saved to DB, just updating local state");
    } else {
      debugLog("Saving improved question to DB:", improvedQuestion);
      handleSaveQuestion(improvedQuestion)
        .then(() => {
          invalidateDesign(projectId);
          setIsEditing(false);
          setIsManualEditMode(false);
        })
        .catch((error) => {
          debugError("Error saving improved question:", error);
          toast({
            title: "Save failed",
            description: "Failed to save the improved question.",
            variant: "destructive"
          });
        });
    }
  });

  const { translations, displayQuestion } = getQuestionDisplayData(savedQuestion, langConfig, activeLang);

  return (
    <div className="space-y-4">
      {savedQuestion && !isEditing ? (
        <div className="p-4 bg-white dark:bg-[#161B22] border dark:border-white/10 rounded-lg">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-medium text-gray-700 dark:text-gray-400">Current Question:</h3>
            {!isReadOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditClick}
                className="flex items-center gap-1 dark:text-gray-300 dark:border-white/20 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>

          {!isLangsLoading && langConfig.enabledLanguages.length > 1 && (
            <div className="mb-4">
              <LanguageTabs 
                enabledLanguages={langConfig.enabledLanguages}
                activeLanguage={activeLang}
                onLanguageChange={setActiveLang}
                translations={translations}
              />
            </div>
          )}

          <div className="text-lg dark:text-gray-200">
            {displayQuestion}
          </div>
        </div>
      ) : (
        <>
          {/* Phase Prerequisites Warning */}
          {validationResult && !validationResult.isValid && !isManualEditMode && (
            <PhasePrerequisitesWarning
              validationResult={validationResult}
              title="AI Generation Unavailable"
              description={
                <span>
                  The Context and Define phases provide essential information that enables AI to generate
                  relevant, project-specific questions. Already know what to ask?{" "}
                  <span
                    className="cursor-pointer underline font-medium"
                    onClick={() => setIsManualEditMode(true)}
                  >
                    Edit manually here.
                  </span>
                </span>
              }
            />
          )}

          {!isReadOnly ? (
            <StoryQuestionEditor
              forceEditMode={isManualEditMode || isEditing}
              onManualStart={() => setIsManualEditMode(true)}
              onCancelEdit={() => {
                setIsEditing(false);
                setIsManualEditMode(false);
              }}
              loading={isLoading || isGenerating}
              error={error || generationError}
              response={aiResponse}
              hasEverSavedQuestion={hasEverSavedQuestion}
              isEditing={isEditing}
              currentQuestion={currentQuestion}
              onGenerateQuestion={handleGeneration}
              onSaveQuestion={handleSaveQuestionWrapped}
              onAcceptImprovement={handleAcceptImprovement}
              projectId={projectId}
            />
          ) : (
            <div className="p-4 bg-white dark:bg-[#161B22] border dark:border-white/10 rounded-lg text-center text-muted-foreground">
              No story question has been set yet.
            </div>
          )}
        </>
      )}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Story Question?</AlertDialogTitle>
            <AlertDialogDescription>
              You are already collecting with this information. Are you sure you would like to change?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>Yes, Change</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StoryQuestionContent;
