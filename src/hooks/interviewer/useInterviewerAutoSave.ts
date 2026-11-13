import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { debugLog, debugError } from "@/utils/debugLogger";
import { UseInterviewerOptions } from "./types";
import { InterviewerState } from "./useInterviewerState";
import { formatSaveErrorMessage } from "./utils";

interface UseInterviewerAutoSaveProps {
  state: InterviewerState;
  storyHasBeenSaved: boolean;
  saveError: string | null;
  isSaving: boolean;
  isAutoSavingRef: React.MutableRefObject<boolean>;
  setStoryHasBeenSaved: (saved: boolean) => void;
  setSaveError: (error: string | null) => void;
  saveConversationAsStory: (userId: string | null) => Promise<boolean>;
  options: UseInterviewerOptions;
  toast: (options: { title: string; description: string; variant?: "default" | "destructive" }) => void;
}

export const useInterviewerAutoSave = ({
  state,
  storyHasBeenSaved,
  saveError,
  isSaving,
  isAutoSavingRef,
  setStoryHasBeenSaved,
  setSaveError,
  saveConversationAsStory,
  options,
  toast,
}: UseInterviewerAutoSaveProps) => {
  useEffect(() => {
    const autoSave = async () => {
      if (
        state.currentPhase === "complete" &&
        !storyHasBeenSaved &&
        !saveError &&
        !isSaving &&
        !isAutoSavingRef.current &&
        state.storyTitle &&
        state.emotionalResponse
      ) {
        isAutoSavingRef.current = true;
        debugLog("Auto-saving interview story...");

        try {
          let userId: string | null = null;
          if (options.isPublic) {
            userId = null;
          } else {
            const {
              data: { user },
              error: authError,
            } = await supabase.auth.getUser();
            if (authError || !user) {
              isAutoSavingRef.current = false;
              debugError("Auto-save failed: User not authenticated", authError);
              const errMsg = formatSaveErrorMessage(authError, "You must be logged in to save stories.");
              setSaveError(errMsg);
              toast({
                title: "Save failed",
                description: errMsg,
                variant: "destructive",
              });
              return;
            }
            userId = user.id;
          }

          const success = await saveConversationAsStory(userId);

          if (success) {
            setStoryHasBeenSaved(true);
            const { queryClient } = await import("@/lib/queryClient");
            const { storiesQueryKey } = await import("@/hooks/queries/useStoriesQuery");
            void queryClient.invalidateQueries({ queryKey: storiesQueryKey(options.projectId) });
          } else {
            isAutoSavingRef.current = false;
          }
        } catch (error) {
          isAutoSavingRef.current = false;
          debugError("Auto-save error:", error);
          const errMsg = formatSaveErrorMessage(error, "Your story could not be saved automatically.");
          setSaveError(errMsg);
          toast({
            title: "Auto-save failed",
            description: errMsg,
            variant: "destructive",
          });
        }
      }
    };

    void autoSave();
  }, [
    state.currentPhase,
    storyHasBeenSaved,
    saveError,
    isSaving,
    state.storyTitle,
    state.emotionalResponse,
    options.isPublic,
    options.projectId,
    saveConversationAsStory,
    setStoryHasBeenSaved,
    setSaveError,
    toast,
    isAutoSavingRef,
  ]);
};
