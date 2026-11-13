import { useEffect } from "react";
import { useStoryQuestionContext } from "./StoryQuestionContext";
import { useCompletionState } from "@/hooks/useCompletionState";
import { devLog, devWarn, safeError } from "@/utils/productionLogger";
import { STORAGE_KEYS } from "@/services/constants/storageKeys";

const LocalStorageManager = () => {
  const { projectId, savedQuestion } = useStoryQuestionContext();

  // Use database-backed completion state
  const { markCompleted, isMarking, isCompleted, isLoading } = useCompletionState({
    projectId,
    phase: 'collection',
    step: 'questions',
    activity: 'story-question',
    enabled: !!projectId
  });

  // Mark activity as completed when question is saved
  useEffect(() => {
    // Skip if loading or already completed
    if (isLoading || isCompleted) {
      return;
    }

    devLog("LocalStorageManager useEffect triggered", {
      projectId,
      hasSavedQuestion: !!savedQuestion,
      savedQuestionLength: savedQuestion?.length,
      isMarking
    });

    const markAsCompleted = async () => {
      if (projectId && savedQuestion && !isMarking) {
        devLog("Attempting to mark story question as completed for project:", projectId);
        try {
          devLog("Marking story question as completed for project:", projectId);

          // Mark in database
          const success = await markCompleted();

          devLog("markCompleted result:", success);

          if (success) {
            // Keep activeProjectId for UI preferences (non-security sensitive)
            localStorage.setItem('activeProjectId', projectId);
            // Keep backward compatibility flag temporarily
            localStorage.setItem(STORAGE_KEYS.STORY_QUESTION_SAVED(projectId), 'true');
            devLog("Story question completion marked successfully");
          } else {
            devWarn("markCompleted returned false");
          }
        } catch (error) {
          safeError("Error marking story question completion:", error);
        }
      } else {
        devLog("Conditions not met for marking completion:", {
          hasProjectId: !!projectId,
          hasSavedQuestion: !!savedQuestion,
          isMarking
        });
      }
    };

    void markAsCompleted();
  }, [projectId, savedQuestion, markCompleted, isMarking, isCompleted, isLoading]);

  return null; // This is a utility component with no UI
};

export default LocalStorageManager;
