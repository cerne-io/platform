
// Type definitions for design outputs

export interface ParticipantQuestion {
  id: string;
  label: string;
  questionType?: 'multiple-choice' | 'checkboxes';
  includePreferNotToSay?: boolean;
  checked?: boolean;
  choices: {
    id: string;
    label: string;
    translations?: Record<string, string>; // lang -> label
  }[];
  translations?: Record<string, string>; // lang -> label
}

export interface ParticipantQuestionsData {
  questions: ParticipantQuestion[];
  includePreferNotToSay: boolean;
}

export interface SliderQuestion {
  id: number;
  theme: string;
  question: string;
  leftLabel: string;
  rightLabel: string;
  sliderValue?: number;
  translations?: Record<string, {
    theme?: string;
    question?: string;
    leftLabel?: string;
    rightLabel?: string;
  }>;
}

export interface TriangleQuestion {
  id: number;
  theme: string;
  question: string;
  topLabel: string;
  bottomLeftLabel: string;
  bottomRightLabel: string;
  defaultX?: number;  // 0-100 (percentage from left)
  defaultY?: number;  // 0-100 (percentage from top)
  translations?: Record<string, {
    theme?: string;
    question?: string;
    topLabel?: string;
    bottomLeftLabel?: string;
    bottomRightLabel?: string;
  }>;
}
