
import { ParticipantQuestion, SliderQuestion, TriangleQuestion } from '../types/designTypes';
import { ProjectLanguages } from '@/constants/languages';
import { CerneBuilderQuestion } from '@/components/design/form-builder/types';

export interface PublicFormData {
  storyQuestion: string | Record<string, string>;
  sliderQuestions: SliderQuestion[];
  participantQuestions: ParticipantQuestion[];
  triangleQuestions: TriangleQuestion[];
  questionType?: 'slider' | 'triangle' | 'both' | null;
  includePreferNotToSay?: boolean;
  languages?: ProjectLanguages;
  formBuilderQuestions?: CerneBuilderQuestion[];
  emotionalResponseQuestion?: CerneBuilderQuestion | null;
  headerText?: string | Record<string, string>;
  subheaderText?: string | Record<string, string>;
}

export interface PublicFormResponse {
  id: string;
  storyQuestion?: string | Record<string, string>;
  sliderQuestions?: SliderQuestion[];
  participantQuestions?: ParticipantQuestion[];
  triangleQuestions?: TriangleQuestion[];
  languages?: ProjectLanguages;
}

// Activity IDs for public form components
export const PUBLIC_FORM_ACTIVITIES = {
  STORY_QUESTION: 'story-question',
  SLIDER_QUESTIONS: 'slider-questions',
  TRIANGLE_QUESTIONS: 'triangle-questions',
  PARTICIPANT_QUESTIONS: 'participant-questions',
  FORM_CONFIG: 'form-config',
  FORM_APPEARANCE: 'form-appearance'
};

// This is for extracting data from supabase response
export interface ActivityResponse {
  ar_response: {
    [key: string]: unknown;
  };
}

// Utility function to check if a value is a plain object (not null, not array, a true object)
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]';
};
