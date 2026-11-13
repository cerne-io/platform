import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChatMessage } from "@/types/chatTypes";
import { UseInterviewerOptions } from "./types";
import { InterviewerState, useInterviewerState } from "./useInterviewerState";

interface UseInterviewerQuestionnairesProps {
  optionsRef: React.MutableRefObject<UseInterviewerOptions>;
  stateRef: React.MutableRefObject<InterviewerState>;
  actions: ReturnType<typeof useInterviewerState>["actions"];
  addMessageWithDelay: (message: ChatMessage, delayMs?: number) => Promise<void>;
}

export const useInterviewerQuestionnaires = ({
  optionsRef,
  stateRef,
  actions,
  addMessageWithDelay,
}: UseInterviewerQuestionnairesProps) => {
  const { t, i18n } = useTranslation();
  const getFixedTForLang = useCallback(() => {
    const lang = optionsRef.current.language || i18n?.language || 'en';
    if (typeof i18n?.getFixedT === 'function') {
      const fixedT = i18n.getFixedT(lang);
      return (key: string, defaultValue?: string): string => String(fixedT(key, defaultValue as never));
    }
    return (key: string, defaultValue?: string): string => String(t(key, defaultValue as never));
  }, [i18n, optionsRef, t]);

  const handleEmotionSelect = useCallback(async (feeling: string, otherFeelingText?: string) => {
    actions.setEmotionalResponse(feeling);
    if (otherFeelingText) {
      actions.setOtherFeeling(otherFeelingText);
    }

    const tForm = getFixedTForLang();

    if (optionsRef.current.sliderQuestions && optionsRef.current.sliderQuestions.length > 0) {
      actions.setPhase("sliders");
      const firstSlider = optionsRef.current.sliderQuestions[0];
      const bridge = tForm(
        "public.interview.transitionToSliders",
        "Thank you for sharing that context. Now I'd like to understand your experience on a few scales."
      );

      void addMessageWithDelay({
        role: "assistant",
        content: `${bridge} ${firstSlider.question}`,
        timestamp: new Date(),
        messageType: "slider",
        interactiveData: {
          questionId: firstSlider.id,
          question: firstSlider.question,
          leftLabel: firstSlider.leftLabel,
          rightLabel: firstSlider.rightLabel,
          theme: firstSlider.theme,
        },
      });
    } else if (optionsRef.current.triangleQuestions && optionsRef.current.triangleQuestions.length > 0) {
      actions.setPhase("triangle");
      const firstTriangle = optionsRef.current.triangleQuestions[0];
      const bridge = tForm(
        "public.interview.transitionToTriangles",
        "Thank you for sharing that context. Now I have some positioning questions."
      );

      void addMessageWithDelay({
        role: "assistant",
        content: `${bridge} ${firstTriangle.question}`,
        timestamp: new Date(),
        messageType: "triangle",
        interactiveData: {
          questionId: firstTriangle.id,
          question: firstTriangle.question,
          topLabel: firstTriangle.topLabel,
          bottomLeftLabel: firstTriangle.bottomLeftLabel,
          bottomRightLabel: firstTriangle.bottomRightLabel,
        },
      });
    } else if (optionsRef.current.participantQuestions && optionsRef.current.participantQuestions.length > 0) {
      actions.setPhase("participant");
      const firstParticipant = optionsRef.current.participantQuestions[0];
      const bridge = tForm(
        "public.interview.participantTransition",
        "Thanks for sharing. Before we conclude, I have a couple of additional questions to get to know you better. You can always skip those questions if you'd like."
      );

      void addMessageWithDelay({
        role: "assistant",
        content: `${bridge} ${firstParticipant.label}`,
        timestamp: new Date(),
        messageType: "multiple_choice",
        interactiveData: {
          questionId: firstParticipant.id,
          question: firstParticipant.label,
          choices: firstParticipant.choices || [],
          questionType: firstParticipant.questionType,
        },
      });
    } else {
      actions.setPhase("additional_comments");
      void addMessageWithDelay({
        role: "assistant",
        content: tForm(
          "public.interview.askAdditionalComments",
          "Thank you. Is there anything else you would like to share about this experience?"
        ),
        timestamp: new Date(),
        messageType: "text",
      });
    }
  }, [actions, addMessageWithDelay, getFixedTForLang, optionsRef]);

  const handleSliderSubmit = useCallback((questionId: number, value: number) => {
    actions.setSliderResponse(questionId, value);

    const question = optionsRef.current.sliderQuestions?.find((q) => q.id === questionId);
    if (!question) return;

    const newResponses = new Map(stateRef.current.sliderResponses).set(questionId, value);
    const unansweredSliders = optionsRef.current.sliderQuestions?.filter((q) => !newResponses.has(q.id)) || [];

    const tForm = getFixedTForLang();

    if (unansweredSliders.length > 0) {
      const nextQuestion = unansweredSliders[0];
      void addMessageWithDelay({
        role: "assistant",
        content: nextQuestion.question,
        timestamp: new Date(),
        messageType: "slider",
        interactiveData: {
          questionId: nextQuestion.id,
          question: nextQuestion.question,
          leftLabel: nextQuestion.leftLabel,
          rightLabel: nextQuestion.rightLabel,
          theme: nextQuestion.theme,
        },
      });
    } else {
      if (optionsRef.current.triangleQuestions && optionsRef.current.triangleQuestions.length > 0) {
        actions.setPhase("triangle");
        const firstTriangle = optionsRef.current.triangleQuestions[0];
        const bridge = tForm(
          "public.interview.transitionToTriangles",
          "Thank you for sharing that context. Now I have some positioning questions."
        );

        void addMessageWithDelay({
          role: "assistant",
          content: `${bridge} ${firstTriangle.question}`,
          timestamp: new Date(),
          messageType: "triangle",
          interactiveData: {
            questionId: firstTriangle.id,
            question: firstTriangle.question,
            topLabel: firstTriangle.topLabel,
            bottomLeftLabel: firstTriangle.bottomLeftLabel,
            bottomRightLabel: firstTriangle.bottomRightLabel,
          },
        });
      } else if (optionsRef.current.participantQuestions && optionsRef.current.participantQuestions.length > 0) {
        actions.setPhase("participant");
        const firstParticipant = optionsRef.current.participantQuestions[0];
        const bridge = tForm(
          "public.interview.participantTransition",
          "Thanks for sharing. Before we conclude, I have a couple of additional questions to get to know you better. You can always skip those questions if you'd like."
        );

        void addMessageWithDelay({
          role: "assistant",
          content: `${bridge} ${firstParticipant.label}`,
          timestamp: new Date(),
          messageType: "multiple_choice",
          interactiveData: {
            questionId: firstParticipant.id,
            question: firstParticipant.label,
            choices: firstParticipant.choices || [],
            questionType: firstParticipant.questionType,
          },
        });
      } else {
        actions.setPhase("additional_comments");
        void addMessageWithDelay({
          role: "assistant",
          content: tForm(
            "public.interview.askAdditionalComments",
            "Is there anything else you would like to share about this experience?"
          ),
          timestamp: new Date(),
          messageType: "text",
        });
      }
    }
  }, [actions, addMessageWithDelay, getFixedTForLang, optionsRef, stateRef]);

  const handleSliderSkip = useCallback((questionId: number) => {
    handleSliderSubmit(questionId, -1);
  }, [handleSliderSubmit]);

  const handleTriangleSubmit = useCallback((questionId: number, x: number, y: number) => {
    actions.setTriangleResponse(questionId, { x, y });

    const question = optionsRef.current.triangleQuestions?.find((q) => q.id === questionId);
    if (!question) return;

    const newResponses = new Map(stateRef.current.triangleResponses).set(questionId, { x, y });
    const unansweredTriangles = optionsRef.current.triangleQuestions?.filter((q) => !newResponses.has(q.id)) || [];

    const tForm = getFixedTForLang();

    if (unansweredTriangles.length > 0) {
      const nextQuestion = unansweredTriangles[0];
      void addMessageWithDelay({
        role: "assistant",
        content: nextQuestion.question,
        timestamp: new Date(),
        messageType: "triangle",
        interactiveData: {
          questionId: nextQuestion.id,
          question: nextQuestion.question,
          topLabel: nextQuestion.topLabel,
          bottomLeftLabel: nextQuestion.bottomLeftLabel,
          bottomRightLabel: nextQuestion.bottomRightLabel,
        },
      });
    } else {
      if (optionsRef.current.participantQuestions && optionsRef.current.participantQuestions.length > 0) {
        actions.setPhase("participant");
        const firstParticipant = optionsRef.current.participantQuestions[0];
        const bridge = tForm(
          "public.interview.participantTransition",
          "Thanks for sharing. Before we conclude, I have a couple of additional questions to get to know you better. You can always skip those questions if you'd like."
        );

        void addMessageWithDelay({
          role: "assistant",
          content: `${bridge} ${firstParticipant.label}`,
          timestamp: new Date(),
          messageType: "multiple_choice",
          interactiveData: {
            questionId: firstParticipant.id,
            question: firstParticipant.label,
            choices: firstParticipant.choices || [],
            questionType: firstParticipant.questionType,
          },
        });
      } else {
        actions.setPhase("additional_comments");
        void addMessageWithDelay({
          role: "assistant",
          content: tForm(
            "public.interview.askAdditionalComments",
            "Is there anything else you would like to share about this experience?"
          ),
          timestamp: new Date(),
          messageType: "text",
        });
      }
    }
  }, [actions, addMessageWithDelay, getFixedTForLang, optionsRef, stateRef]);

  const handleTriangleSkip = useCallback((questionId: number) => {
    handleTriangleSubmit(questionId, -1, -1);
  }, [handleTriangleSubmit]);

  const handleParticipantSubmit = useCallback((questionId: string, choiceId: string) => {
    actions.setParticipantResponse(questionId, choiceId);

    const newResponses = new Map(stateRef.current.participantResponses).set(questionId, choiceId);
    const unansweredParticipants = optionsRef.current.participantQuestions?.filter((q) => !newResponses.has(q.id)) || [];

    const tForm = getFixedTForLang();

    if (unansweredParticipants.length > 0) {
      const nextQuestion = unansweredParticipants[0];
      void addMessageWithDelay({
        role: "assistant",
        content: nextQuestion.label,
        timestamp: new Date(),
        messageType: "multiple_choice",
        interactiveData: {
          questionId: nextQuestion.id,
          question: nextQuestion.label,
          choices: nextQuestion.choices || [],
          questionType: nextQuestion.questionType,
        },
      });
    } else {
      actions.setPhase("additional_comments");
      void addMessageWithDelay({
        role: "assistant",
        content: tForm(
          "public.interview.askAdditionalCommentsParticipant",
          "Thank you. Is there anything else you would like to share about this experience?"
        ),
        timestamp: new Date(),
        messageType: "text",
      });
    }
  }, [actions, addMessageWithDelay, getFixedTForLang, optionsRef, stateRef]);

  const handleParticipantSkip = useCallback((questionId: string) => {
    handleParticipantSubmit(questionId, "SKIPPED");
  }, [handleParticipantSubmit]);

  return {
    handleEmotionSelect,
    handleSliderSubmit,
    handleSliderSkip,
    handleTriangleSubmit,
    handleTriangleSkip,
    handleParticipantSubmit,
    handleParticipantSkip,
  };
};
