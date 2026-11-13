
import { FormAppearance } from "@/components/design/form-appearance/types";
import { SliderQuestion, ParticipantQuestion, TriangleQuestion } from "@/services/types/designTypes";
import { ProjectLanguages } from "@/constants/languages";
import { CerneBuilderQuestion } from "@/components/design/form-builder/types";

export interface FormDataState {
  storyQuestion: string | Record<string, string>;
  storyText?: string;
  storyTitle?: string;
  feeling?: string;
  otherFeeling?: string;
  sliderQuestions: SliderQuestion[];
  participantQuestions: ParticipantQuestion[];
  triangleQuestions: TriangleQuestion[];
  additionalComments?: string;
  formDesigned: boolean;
  isLoading: boolean;
  error?: string | null;
  appearance?: FormAppearance;
  questionType?: 'slider' | 'triangle' | 'both' | null;
  languages?: ProjectLanguages;
  formBuilderQuestions?: CerneBuilderQuestion[];
  emotionalResponseQuestion?: CerneBuilderQuestion | null;
}
