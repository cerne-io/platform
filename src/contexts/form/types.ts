
import { ReactNode } from "react";
import { SliderQuestion, ParticipantQuestion, TriangleQuestion } from "@/services/types/designTypes";
import { StoryData } from "@/hooks/collect/form-submission/types";
import { CerneBuilderQuestion } from "@/components/design/form-builder/types";

export interface FormContextType {
  storyQuestion?: string | Record<string, string>;
  storyText: string;
  setStoryText: (text: string) => void;
  storyTitle: string;
  setStoryTitle: (title: string) => void;
  feeling: string;
  setFeeling: (feeling: string) => void;
  otherFeeling: string;
  setOtherFeeling: (feeling: string) => void;
  additionalComments: string;
  setAdditionalComments: (comments: string) => void;
  emotionalResponseQuestion?: CerneBuilderQuestion | null;
  activeLang?: string;
  sliderQuestions?: SliderQuestion[];
  sliderValues: Record<string | number, number | null | "n/a">;
  updateSliderValue: (id: string | number, value: number | null) => void;
  handleSliderChange: (id: number | string, value: number[] | "n/a") => void;
  touchedSliders: Set<number>;
  setTouchedSliders: React.Dispatch<React.SetStateAction<Set<number>>>;
  participantQuestions?: ParticipantQuestion[];
  participantValues: Record<string, string>;
  updateParticipantValue: (id: string | number, value: string) => void;
  participantAnswers: Record<string, string>;
  handleParticipantAnswerChange: (id: string | number, value: string) => void;
  triangleQuestions?: TriangleQuestion[];
  triangleValues: Record<string | number, { x: number; y: number } | "n/a">;
  updateTriangleValue: (id: string | number, x: number, y: number) => void;
  handleTriangleChange: (id: number | string, x: number | "n/a", y?: number) => void;
  touchedTriangles: Set<number>;
  setTouchedTriangles: React.Dispatch<React.SetStateAction<Set<number>>>;
  isSubmitting: boolean;
  isValid: boolean;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onSubmit: (data: StoryData) => Promise<boolean | string>;
  resetForm?: () => void;
}

export interface FormProviderProps {
  children: ReactNode;
  initialValues: {
    storyQuestion?: string | Record<string, string>;
    sliderQuestions?: SliderQuestion[];
    participantQuestions?: ParticipantQuestion[];
    triangleQuestions?: TriangleQuestion[];
    emotionalResponseQuestion?: CerneBuilderQuestion | null;
    activeLang?: string;
  };
  onSubmit: (data: StoryData) => Promise<boolean | string>;
}

export interface FormHandlersProps {
  storyText: string;
  storyTitle: string;
  feeling: string;
  otherFeeling: string;
  emotionalResponseQuestion?: CerneBuilderQuestion | null;
  additionalComments: string;
  touchedSliders: Set<number>;
  sliderValues: Record<string | number, number | null | "n/a">;
  sliderQuestions?: SliderQuestion[];
  participantQuestions?: ParticipantQuestion[];
  participantAnswers: Record<string, string>;
  triangleQuestions?: TriangleQuestion[];
  triangleValues: Record<string | number, { x: number; y: number } | "n/a">;
  touchedTriangles: Set<number>;
  setParticipantAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isSubmitting: boolean;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setStoryText: React.Dispatch<React.SetStateAction<string>>;
  setStoryTitle: React.Dispatch<React.SetStateAction<string>>;
  setFeeling: React.Dispatch<React.SetStateAction<string>>;
  setOtherFeeling: React.Dispatch<React.SetStateAction<string>>;
  setAdditionalComments: React.Dispatch<React.SetStateAction<string>>;
  setSliderValues: React.Dispatch<React.SetStateAction<Record<string | number, number | null | "n/a">>>;
  setTouchedSliders: React.Dispatch<React.SetStateAction<Set<number>>>;
  setTriangleValues: React.Dispatch<React.SetStateAction<Record<string | number, { x: number; y: number } | "n/a">>>;
  setTouchedTriangles: React.Dispatch<React.SetStateAction<Set<number>>>;
  onSubmit: (data: StoryData) => Promise<boolean | string>;
}
