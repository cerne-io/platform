
import { useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { FormHandlersProps } from "./types";
import { StoryData } from "@/hooks/collect/form-submission/types";
import { buildSliderResponses } from "./utils/buildSliderResponses";
import { buildParticipantResponses } from "./utils/buildParticipantResponses";
import { buildTriangleResponses } from "./utils/buildTriangleResponses";
import { useParticipantAnswers } from "./hooks/useParticipantAnswers";
import { debugLog, debugError } from "@/utils/debugLogger";

export const useFormHandlers = ({
  storyText,
  storyTitle,
  feeling,
  otherFeeling,
  emotionalResponseQuestion,
  additionalComments,
  touchedSliders,
  sliderValues,
  sliderQuestions,
  participantQuestions,
  participantAnswers,
  setParticipantAnswers,
  triangleQuestions,
  triangleValues,
  touchedTriangles,
  isSubmitting: _isSubmitting,
  setIsSubmitting,
  setStoryText,
  setStoryTitle,
  setFeeling,
  setOtherFeeling,
  setAdditionalComments,
  setSliderValues,
  setTouchedSliders,
  setTriangleValues,
  setTouchedTriangles,
  onSubmit
}: FormHandlersProps) => {
  const { toast } = useToast();
  const {
    participantValues,
    updateParticipantValue,
    handleParticipantAnswerChange,
    resetParticipantAnswers
  } = useParticipantAnswers(setParticipantAnswers);

  // Reset form function to clear all fields after successful submission
  const resetForm = useCallback(() => {
    // Reset text inputs
    setStoryText("");
    setStoryTitle("");
    setFeeling("");
    setOtherFeeling("");
    setAdditionalComments("");

    // Reset slider values
    setSliderValues({});
    setTouchedSliders(new Set());

    // Reset triangle values
    setTriangleValues({});
    setTouchedTriangles(new Set());

    // Reset participant answers
    setParticipantAnswers({});
    resetParticipantAnswers();

    debugLog("Form has been reset after successful submission");
  }, [
    setStoryText,
    setStoryTitle,
    setFeeling,
    setOtherFeeling,
    setAdditionalComments,
    setSliderValues,
    setTouchedSliders,
    setTriangleValues,
    setTouchedTriangles,
    setParticipantAnswers,
    resetParticipantAnswers
  ]);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!storyText.trim()) {
      toast({
        title: "Missing story",
        description: "Please share your story before submitting.",
        variant: "warning"
      });
      return;
    }

    if (!storyTitle.trim()) {
      toast({
        title: "Missing title",
        description: "Please add a title to your story.",
        variant: "warning"
      });
      return;
    }

    if (!feeling) {
      toast({
        title: "Missing emotion",
        description: "Please select how you felt about this experience.",
        variant: "warning"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const sliderResponses = buildSliderResponses(sliderQuestions || [], sliderValues, touchedSliders);
      const triangleResponses = buildTriangleResponses(triangleQuestions || [], triangleValues, touchedTriangles);

      const selectedOption = emotionalResponseQuestion?.options?.find((o) => o.id === feeling);
      const isOther =
        feeling === 'other' ||
        selectedOption?.id?.toLowerCase() === 'other' ||
        selectedOption?.label?.toLowerCase() === 'other';

      const resolvedEmotion = isOther
        ? (otherFeeling.trim() || 'other')
        : (selectedOption ? selectedOption.label : feeling);

      const storyData: StoryData = {
        title: storyTitle,
        text: storyText,
        emotionalResponse: resolvedEmotion,
        additionalComments: additionalComments || "",
        sliderResponses,
        participantResponses: buildParticipantResponses(participantQuestions || [], participantAnswers),
        triangleResponses,
        hasAudio: false
      };

      const success = await onSubmit(storyData);

      if (success === true) {
        // Reset form after successful submission
        resetForm();
      }
    } catch (error) {
      debugError("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    storyText,
    storyTitle,
    feeling,
    otherFeeling,
    additionalComments,
    touchedSliders,
    sliderValues,
    sliderQuestions,
    participantQuestions,
    participantAnswers,
    triangleQuestions,
    triangleValues,
    touchedTriangles,
    setIsSubmitting,
    onSubmit,
    toast,
    resetForm,
    emotionalResponseQuestion?.options
  ]);

  return {
    handleSubmit,
    updateParticipantValue,
    handleParticipantAnswerChange,
    participantValues,
    resetForm
  };
};
