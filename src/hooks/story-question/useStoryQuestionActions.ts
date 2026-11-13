
import { useState } from "react";
import { saveStoryQuestionWithSync } from "@/services/sync/storyQuestionSyncService";
import { toast } from "@/components/ui/use-toast";
import { STORAGE_KEYS } from "@/services/constants/storageKeys";
import { clearFormDataCache } from "@/services/cache/formDataCache";
import { clearActivityCache } from "@/services/supabaseSync/operations/cache/responseCache";
import { debugLog, debugError } from "@/utils/debugLogger";

interface UseStoryQuestionActionsProps {
  projectId?: string;
  savedQuestion: string | Record<string, string> | null;
  setSavedQuestion: (question: string | Record<string, string> | null) => void;
  setCurrentQuestion: (question: string | Record<string, string> | null) => void;
  setIsEditing: (isEditing: boolean) => void;
  setHasEverSavedQuestion: (hasEverSaved: boolean) => void;
  setError?: (error: string | null) => void;
}

export const useStoryQuestionActions = (props: UseStoryQuestionActionsProps | string) => {
  const [isSaving, setIsSaving] = useState(false);

  // Handle both types of arguments (string or object)
  const projectId = typeof props === 'string' ? props : props.projectId;
  // Get setError from props if available
  const setError = typeof props !== 'string' ? props.setError : undefined;

  // Save story question to the database
  const saveStoryQuestion = async (question: string | Record<string, string>): Promise<boolean> => {
    if (!projectId) {
      const errorMsg = "Cannot save story question: No project ID provided";
      debugError(errorMsg);
      if (setError) setError(errorMsg);
      toast({
        title: "Save failed",
        description: "No project selected. Please select a project first.",
        variant: "destructive"
      });
      return false;
    }

    setIsSaving(true);
    if (setError) setError(null);

    try {
      // Clear all caches before saving to ensure no stale data
      try {
        clearFormDataCache(projectId, 'form_data');

        // Clear all potential storage locations of story question with consolidated ID
        clearActivityCache(projectId, 'collection', 'story-questions', 'story-questions');
        clearActivityCache(projectId, 'collection', 'public-form', 'public-story-questions');
        clearActivityCache(projectId, 'design', 'story-questions', 'story-questions');
      } catch (error) {
        debugError("Error clearing cache before save:", error);
      }

      await saveStoryQuestionWithSync(projectId, question);
      debugLog("Story question saved successfully");

      // Update localStorage immediately after saving
      try {
        localStorage.setItem(STORAGE_KEYS.STORY_QUESTION_SAVED(projectId), 'true');
        const contentToStore = typeof question === 'string' ? question : JSON.stringify(question);
        localStorage.setItem(STORAGE_KEYS.STORY_QUESTION_CONTENT(projectId), contentToStore);
        localStorage.setItem(`${STORAGE_KEYS.STORY_QUESTION_SAVED(projectId)}_last_save`, Date.now().toString());
      } catch (storageError) {
        debugError("Error updating localStorage after save:", storageError);
      }

      // Dispatch a custom event to notify other components about the story question save
      try {
        window.dispatchEvent(new CustomEvent('story_question_saved', {
          detail: { projectId, question }
        }));
      } catch (eventError) {
        debugError("Error dispatching story_question_saved event:", eventError);
      }

      return true;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Error saving story question";
      debugError("Error saving story question:", error);
      if (setError) setError(errorMsg);

      toast({
        title: "Save failed",
        description: "Failed to save story question. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle saving the question (for object-style props)
  const handleSaveQuestion = async (question: string | Record<string, string>): Promise<boolean> => {
    if (typeof props !== 'string') {
      const success = await saveStoryQuestion(question);

      if (success) {
        props.setSavedQuestion(question);
        props.setCurrentQuestion(question);
        props.setIsEditing(false);
        props.setHasEverSavedQuestion(true);

        // Also update localStorage to ensure consistency
        try {
          localStorage.setItem(STORAGE_KEYS.STORY_QUESTION_SAVED(projectId), 'true');
          const contentToStore = typeof question === 'string' ? question : JSON.stringify(question);
          localStorage.setItem(STORAGE_KEYS.STORY_QUESTION_CONTENT(projectId), contentToStore);
          localStorage.setItem(`${STORAGE_KEYS.STORY_QUESTION_SAVED(projectId)}_last_save`, Date.now().toString());
        } catch (storageError) {
          debugError("Error updating localStorage after save:", storageError);
        }

        toast({
          title: "Question saved",
          description: "Your story question has been saved successfully.",
        });
      }

      return success;
    } else {
      return await saveStoryQuestion(question);
    }
  };

  // Handle edit question action (for object-style props)
  const handleEditQuestion = () => {
    if (typeof props !== 'string') {
      props.setIsEditing(true);
      if (props.setError) props.setError(null);
    }
  };

  // Return appropriate functions based on props type
  if (typeof props === 'string') {
    return {
      saveStoryQuestion,
      isSaving
    };
  } else {
    return {
      saveStoryQuestion,
      handleSaveQuestion,
      handleEditQuestion,
      isSaving
    };
  }
};
