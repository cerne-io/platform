/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useContext, useEffect } from "react";
import { FormContextType, FormProviderProps } from "./types";
import { useFormInitialization } from "./useFormInitialization";
import { useFormHandlers } from "./useFormHandlers";
import { debugLog } from "@/utils/debugLogger";

const FormContext = createContext<FormContextType | undefined>(undefined);

export const FormProvider: React.FC<FormProviderProps> = ({ children, initialValues, onSubmit }) => {
  // Debug questions when FormProvider is created
  useEffect(() => {
    debugLog("FormProvider - Initializing with:", {
      storyQuestion: initialValues.storyQuestion ? "Present" : "Missing",
      sliderQuestionsCount: initialValues.sliderQuestions?.length || 0,
      participantQuestionsCount: initialValues.participantQuestions?.length || 0,
      triangleQuestionsCount: initialValues.triangleQuestions?.length || 0,
      sliderQuestions: initialValues.sliderQuestions?.map(q => ({
        id: q.id,
        question: q.question?.substring(0, 30)
      }))
    });
  }, [initialValues]);

  // Initialize form state
  const formState = useFormInitialization(
    initialValues.sliderQuestions || [],
    initialValues.participantQuestions || [],
    initialValues.triangleQuestions || []
  );

  // Set up form handlers with all necessary state setter functions for reset capability
  const handlers = useFormHandlers({
    ...formState,
    sliderQuestions: initialValues.sliderQuestions,
    participantQuestions: initialValues.participantQuestions,
    triangleQuestions: initialValues.triangleQuestions,
    emotionalResponseQuestion: initialValues.emotionalResponseQuestion,
    triangleValues: formState.triangleValues,
    touchedTriangles: formState.touchedTriangles,
    setStoryText: formState.setStoryText,
    setStoryTitle: formState.setStoryTitle,
    setFeeling: formState.setFeeling,
    setOtherFeeling: formState.setOtherFeeling,
    setAdditionalComments: formState.setAdditionalComments,
    setSliderValues: formState.setSliderValues,
    setTouchedSliders: formState.setTouchedSliders,
    setTriangleValues: formState.setTriangleValues,
    setTouchedTriangles: formState.setTouchedTriangles,
    onSubmit
  });

  // Create proper wrapped handlers that match the type signatures
  const updateSliderValue = (id: string | number, value: number | null) => {
    // Convert id to number if needed for the internal implementation
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    // Call the internal implementation
    formState.setSliderValues(prev => ({
      ...prev,
      [numericId]: value
    }));
  };

  const handleSliderChange = (id: number | string, value: number[] | "n/a") => {
    // Convert id to number if needed
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;

    // Handle the n/a case
    if (value === "n/a") {
      formState.setSliderValues(prev => ({
        ...prev,
        [numericId]: "n/a"
      }));
      return;
    }

    // Handle the array case - take the first value
    const numericValue = value[0] || 50;
    formState.setSliderValues(prev => ({
      ...prev,
      [numericId]: numericValue
    }));
  };

  const updateTriangleValue = (id: string | number, x: number, y: number) => {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    formState.setTriangleValues(prev => ({
      ...prev,
      [numericId]: { x, y }
    }));
  };

  const handleTriangleChange = (id: number | string, x: number | "n/a", y?: number) => {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;

    // Handle the n/a case
    if (x === "n/a") {
      formState.setTriangleValues(prev => ({
        ...prev,
        [numericId]: "n/a"
      }));
      return;
    }

    // Ensure y is defined for non-n/a updates
    const safeY = y ?? 0;

    formState.setTriangleValues(prev => ({
      ...prev,
      [numericId]: { x, y: safeY }
    }));
  };

  // Debug participant answers on changes
  useEffect(() => {
    debugLog("FormContext - Current participant answers:", formState.participantAnswers);
  }, [formState.participantAnswers]);

  const value: FormContextType = {
    storyQuestion: initialValues.storyQuestion,
    storyText: formState.storyText,
    setStoryText: formState.setStoryText,
    storyTitle: formState.storyTitle,
    setStoryTitle: formState.setStoryTitle,
    feeling: formState.feeling,
    setFeeling: formState.setFeeling,
    otherFeeling: formState.otherFeeling,
    setOtherFeeling: formState.setOtherFeeling,
    additionalComments: formState.additionalComments,
    setAdditionalComments: formState.setAdditionalComments,
    emotionalResponseQuestion: initialValues.emotionalResponseQuestion,
    activeLang: initialValues.activeLang,
    sliderQuestions: initialValues.sliderQuestions,
    sliderValues: formState.sliderValues,
    updateSliderValue,
    handleSliderChange,
    touchedSliders: formState.touchedSliders,
    setTouchedSliders: formState.setTouchedSliders,
    triangleQuestions: initialValues.triangleQuestions,
    triangleValues: formState.triangleValues,
    updateTriangleValue,
    handleTriangleChange,
    touchedTriangles: formState.touchedTriangles,
    setTouchedTriangles: formState.setTouchedTriangles,
    participantQuestions: initialValues.participantQuestions,
    participantValues: handlers.participantValues || {},
    updateParticipantValue: handlers.updateParticipantValue,
    participantAnswers: formState.participantAnswers,
    handleParticipantAnswerChange: handlers.handleParticipantAnswerChange,
    isSubmitting: formState.isSubmitting,
    isValid: true,
    handleSubmit: handlers.handleSubmit,
    onSubmit,
    resetForm: handlers.resetForm
  };

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
};

export const useForm = () => {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error("useForm must be used within a FormProvider");
  }
  return context;
};
