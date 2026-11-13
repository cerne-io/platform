import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ChatMessage } from "@/types/chatTypes";
import { debugLog } from "@/utils/debugLogger";
import { UseInterviewerOptions } from "./types";
import { InterviewerState, useInterviewerState } from "./useInterviewerState";
import { useInterviewerService } from "./useInterviewerService";

interface UseInterviewerFlowProps {
  optionsRef: React.MutableRefObject<UseInterviewerOptions>;
  stateRef: React.MutableRefObject<InterviewerState>;
  actions: ReturnType<typeof useInterviewerState>["actions"];
  clearPersistenceState: () => void;
  callInterviewer: ReturnType<typeof useInterviewerService>["callInterviewer"];
  getTransitionMessage: ReturnType<typeof useInterviewerService>["getTransitionMessage"];
  handleEmotionSelect: (feeling: string, otherFeelingText?: string) => Promise<void>;
  addMessageWithDelay: (message: ChatMessage, delayMs?: number) => Promise<void>;
  isAutoSavingRef: React.MutableRefObject<boolean>;
  toast: (options: { title: string; description: string; variant?: "default" | "destructive" }) => void;
}

export const useInterviewerFlow = ({
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
}: UseInterviewerFlowProps) => {
  const { t, i18n } = useTranslation();
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (startTimerRef.current) {
        clearTimeout(startTimerRef.current);
        startTimerRef.current = null;
      }
    };
  }, []);

  const getFixedTForLang = useCallback(() => {
    const lang = optionsRef.current.language || i18n?.language || 'en';
    if (typeof i18n?.getFixedT === 'function') {
      const fixedT = i18n.getFixedT(lang);
      return (key: string, defaultValue?: string): string => String(fixedT(key, defaultValue as never));
    }
    return (key: string, defaultValue?: string): string => String(t(key, defaultValue as never));
  }, [i18n, optionsRef, t]);

  const startInterview = useCallback(async () => {
    if (!optionsRef.current.storyQuestion) {
      toast({
        title: "No story question available",
        description: "Please set up a story question for your project first.",
        variant: "destructive",
      });
      return;
    }

    actions.resetState();
    clearPersistenceState();

    const tForm = getFixedTForLang();

    // DETERMINISTIC START: Split greeting and question
    const greeting = tForm(
      "public.interview.greeting",
      "Hello! I'm here to listen to your experience. All responses are anonymous. Please tell us..."
    );

    actions.addMessage({
      role: "assistant",
      content: greeting,
      timestamp: new Date(),
      messageType: "text",
    });

    actions.setInterviewStarted(true);
    actions.setIsThinking(true);

    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }

    // 2 second delay for the main question
    startTimerRef.current = setTimeout(() => {
      startTimerRef.current = null;
      const question =
        optionsRef.current.storyQuestion ||
        tForm("public.interview.fallbackStoryQuestion", "Please tell us your story.");
      actions.addMessage({
        role: "assistant",
        content: question,
        timestamp: new Date(),
        messageType: "text",
        phase: "story",
      });
      actions.incrementAssistantMessageCount(); // assistantMessageCount becomes 1
      actions.setIsThinking(false);
    }, 2000);

    toast({
      title: "Interview started",
      description: "You can now share your story.",
    });
  }, [actions, clearPersistenceState, getFixedTForLang, optionsRef, toast]);

  const sendMessage = useCallback(
    async (
      message: string,
      _justAnsweredSliderId?: number,
      _justAnsweredTriangleId?: number,
      _justAnsweredParticipantId?: string,
      prependSystemMessages?: ChatMessage[]
    ) => {
      if (
        !message.trim() ||
        !stateRef.current.isInterviewStarted ||
        stateRef.current.assistantMessageCount === 0
      ) {
        return false;
      }

      let currentPhase = stateRef.current.currentPhase;

      const userMessage: ChatMessage = {
        role: "user",
        content: message,
        timestamp: new Date(),
        messageType: "text",
        phase: currentPhase,
      };

      const currentMessages = [...stateRef.current.messages, userMessage];
      actions.addMessage(userMessage);

      if (currentPhase === "story") {
        if (stateRef.current.assistantMessageCount === 1) {
          const result = await callInterviewer(
            message,
            currentMessages,
            prependSystemMessages,
            {
              sliderQuestions: [],
              triangleQuestions: [],
              participantQuestions: [],
            }
          );

          if (result.error || result.skipped) {
            debugLog(
              result.skipped
                ? "AI probe disabled/unconfigured, advancing directly to metadata_title"
                : "AI probe unavailable, bypassing to metadata_title:",
              result.error
            );
            currentPhase = "metadata_title";
            actions.setPhase("metadata_title");
            actions.incrementAssistantMessageCount();

            const tForm = getFixedTForLang();
            void addMessageWithDelay({
              role: "assistant",
              content: tForm(
                "public.interview.askTitle",
                "Thank you for sharing that. Finally, could you give your story a short title and some #hashtags?"
              ),
              timestamp: new Date(),
              messageType: "text",
              phase: "metadata_title",
            });
            return true;
          }

          if (result.response) {
            actions.incrementAssistantMessageCount();
            actions.addMessage({
              role: "assistant",
              content: result.response,
              timestamp: new Date(),
              messageType: "text",
              phase: "story",
            });
          }
          return true;
        } else if (stateRef.current.assistantMessageCount === 2) {
          // STEP 3: Transition to Title & Hashtags (metadata_title)
          currentPhase = "metadata_title";
          actions.setPhase("metadata_title");

          const tForm = getFixedTForLang();
          void addMessageWithDelay({
            role: "assistant",
            content: tForm(
              "public.interview.askTitle",
              "Thank you for sharing that. Finally, could you give your story a short title and some #hashtags?"
            ),
            timestamp: new Date(),
            messageType: "text",
            phase: "metadata_title",
          });
          return true;
        }
      }

      if (currentPhase === "metadata_title") {
        // User provided the title & hashtags
        actions.setStoryTitle(message);

        // STEP 4: Transition to Sentiment (metadata_emotion)
        currentPhase = "metadata_emotion";
        actions.setPhase("metadata_emotion");

        const emotionPrompt = await getTransitionMessage(
          "askEmotion",
          "Now ask the user how they feel about the experience they shared.",
          "Thank you. Now, how do you feel about the experience you shared?"
        );

        void addMessageWithDelay({
          role: "assistant",
          content: emotionPrompt,
          timestamp: new Date(),
          messageType: "emotion_selection",
          phase: "metadata_emotion",
        });
        return true;
      }

      if (currentPhase === "metadata_emotion") {
        void handleEmotionSelect(message);
        return true;
      }

      if (currentPhase === "sliders" || currentPhase === "triangle" || currentPhase === "participant") {
        return true;
      }

      if (currentPhase === "additional_comments") {
        actions.setAdditionalComments(message);
        actions.setPhase("complete");
        const tForm = getFixedTForLang();
        void addMessageWithDelay({
          role: "assistant",
          content: tForm(
            "public.interview.conclusion",
            "Thank you so much for your participation and for sharing your experience! Your contribution is very valuable."
          ),
          timestamp: new Date(),
          messageType: "text",
          phase: "complete",
        });
        return true;
      }

      return true;
    },
    [actions, addMessageWithDelay, callInterviewer, getFixedTForLang, getTransitionMessage, handleEmotionSelect, stateRef]
  );

  const clearInterview = useCallback(() => {
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    actions.setIsThinking(false);
    isAutoSavingRef.current = false;
    actions.resetState();
    clearPersistenceState();
  }, [actions, clearPersistenceState, isAutoSavingRef]);

  return {
    startInterview,
    sendMessage,
    clearInterview,
  };
};
