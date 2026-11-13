import { useCallback, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ChatMessage } from "@/types/chatTypes";

import { UseInterviewerOptions } from "./interviewer/types";
import { useInterviewerState } from "./interviewer/useInterviewerState";
import { useInterviewerService } from "./interviewer/useInterviewerService";
import { useInterviewerPersistence } from "./interviewer/useInterviewerPersistence";
import { useInterviewerQuestionnaires } from "./interviewer/useInterviewerQuestionnaires";
import { useInterviewerFlow } from "./interviewer/useInterviewerFlow";
import { useInterviewerAutoSave } from "./interviewer/useInterviewerAutoSave";

export type { UseInterviewerOptions };

export const useInterviewer = (options: UseInterviewerOptions = {}) => {
  const { toast } = useToast();

  const { state, actions } = useInterviewerState();
  const { isLoading, error, callInterviewer, getTransitionMessage } = useInterviewerService(options);
  const {
    storyHasBeenSaved,
    saveError,
    isSaving,
    retrySave: persistenceRetrySave,
    setStoryHasBeenSaved,
    setSaveError,
    clearPersistenceState,
    exportConversation: exportConv,
    saveConversationAsStory: saveConv,
  } = useInterviewerPersistence(options);

  // Store options and state in refs to avoid stale closures in callbacks
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const isAutoSavingRef = useRef(false);

  const addMessageWithDelay = useCallback(
    async (message: ChatMessage, delayMs: number = 2000) => {
      actions.setIsThinking(true);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      actions.addMessage(message);
      actions.setIsThinking(false);
    },
    [actions]
  );

  const {
    handleEmotionSelect,
    handleSliderSubmit,
    handleSliderSkip,
    handleTriangleSubmit,
    handleTriangleSkip,
    handleParticipantSubmit,
    handleParticipantSkip,
  } = useInterviewerQuestionnaires({
    optionsRef,
    stateRef,
    actions,
    addMessageWithDelay,
  });

  const { startInterview, sendMessage, clearInterview } = useInterviewerFlow({
    optionsRef,
    stateRef,
    actions,
    clearPersistenceState,
    callInterviewer,
    getTransitionMessage,
    handleEmotionSelect,
    addMessageWithDelay,
    isAutoSavingRef,
    toast,
  });

  const handleRetrySave = useCallback(() => {
    isAutoSavingRef.current = false;
    persistenceRetrySave();
  }, [persistenceRetrySave]);

  const exportConversation = useCallback(() => {
    exportConv(state.messages);
  }, [exportConv, state.messages]);

  const saveConversationAsStory = useCallback(
    async (userId: string | null) => {
      return saveConv(
        state.messages,
        state.storyTitle,
        state.emotionalResponse,
        state.otherFeeling,
        state.additionalComments,
        userId,
        {
          sliderResponses: state.sliderResponses,
          triangleResponses: state.triangleResponses,
          participantResponses: state.participantResponses,
        }
      );
    },
    [saveConv, state]
  );

  const canSaveConversation = !!state.storyTitle && state.messages.some((m) => m.role === "user");

  useInterviewerAutoSave({
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
  });

  return {
    messages: state.messages,
    isLoading,
    isSaving,
    error,
    isInterviewStarted: state.isInterviewStarted,
    currentPhase: state.currentPhase,
    isThinking: state.isThinking,
    sliderResponses: state.sliderResponses,
    triangleResponses: state.triangleResponses,
    participantResponses: state.participantResponses,
    storyTitle: state.storyTitle,
    emotionalResponse: state.emotionalResponse,
    otherFeeling: state.otherFeeling,
    storyHasBeenSaved,
    saveError,
    retrySave: handleRetrySave,
    startInterview,
    sendMessage,
    clearInterview,
    exportConversation,
    saveConversationAsStory,
    handleSliderSubmit,
    handleSliderSkip,
    handleTriangleSubmit,
    handleTriangleSkip,
    handleParticipantSubmit,
    handleParticipantSkip,
    handleEmotionSelect,
    canSaveConversation,
  };
};