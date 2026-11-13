
import { useState, useEffect } from "react";
import { SliderQuestion, ParticipantQuestion, TriangleQuestion } from "@/services/types/designTypes";
import { debugLog } from "@/utils/debugLogger";

export const useFormInitialization = (
  sliderQuestions: SliderQuestion[],
  participantQuestions: ParticipantQuestion[],
  triangleQuestions: TriangleQuestion[]
) => {
  // Story text and title
  const [storyText, setStoryText] = useState<string>("");
  const [storyTitle, setStoryTitle] = useState<string>("");

  // Emotional response
  const [feeling, setFeeling] = useState<string>("");
  const [otherFeeling, setOtherFeeling] = useState<string>("");

  // Additional comments
  const [additionalComments, setAdditionalComments] = useState<string>("");

  // Slider values - initialize with empty object
  const [sliderValues, setSliderValues] = useState<Record<string | number, number | null | "n/a">>({});

  // Tracked which sliders have been touched
  const [touchedSliders, setTouchedSliders] = useState<Set<number>>(new Set());

  // Participant answers - initialize with empty object
  const [participantAnswers, setParticipantAnswers] = useState<Record<string, string>>({});

  // Triangle values - initialize with empty object
  const [triangleValues, setTriangleValues] = useState<Record<string | number, { x: number; y: number } | "n/a">>({});

  // Tracked which triangles have been touched
  const [touchedTriangles, setTouchedTriangles] = useState<Set<number>>(new Set());

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Debug participant questions when this hook is called
  useEffect(() => {
    debugLog("useFormInitialization - participant questions count:", participantQuestions?.length);
    debugLog("useFormInitialization - triangle questions count:", triangleQuestions?.length);
  }, [participantQuestions, triangleQuestions]);

  return {
    storyText,
    setStoryText,
    storyTitle,
    setStoryTitle,
    feeling,
    setFeeling,
    otherFeeling,
    setOtherFeeling,
    additionalComments,
    setAdditionalComments,
    sliderValues,
    setSliderValues,
    touchedSliders,
    setTouchedSliders,
    participantAnswers,
    setParticipantAnswers,
    triangleValues,
    setTriangleValues,
    touchedTriangles,
    setTouchedTriangles,
    isSubmitting,
    setIsSubmitting
  };
};
