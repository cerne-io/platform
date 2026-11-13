export type CerneQuestionType = 'story-question' | 'emotional-response' | 'slider' | 'triangle' | 'participant-questions' | 'multiple-choice' | 'checkboxes';

export interface ChoiceOption {
  id: string;
  label: string;
  translations?: Record<string, string>;
}

export interface SliderConfig {
  leftLabel: string;
  rightLabel: string;
  min: number;
  max: number;
  step: number;
  defaultValue?: number;
}

export interface TriangleConfig {
  topLabel: string;
  bottomLeftLabel: string;
  bottomRightLabel: string;
  defaultX?: number;
  defaultY?: number;
}

export interface CerneBuilderQuestion {
  id: string;
  type: CerneQuestionType;
  label: string;
  placeholder?: string;
  theme?: string;
  required?: boolean;
  options?: ChoiceOption[];
  includePreferNotToSay?: boolean;
  sliderConfig?: SliderConfig;
  triangleConfig?: TriangleConfig;
  translations?: Record<string, {
    label?: string;
    placeholder?: string;
    theme?: string;
    leftLabel?: string;
    rightLabel?: string;
    topLabel?: string;
    bottomLeftLabel?: string;
    bottomRightLabel?: string;
  }>;
}

export interface QuestionTypeInfo {
  id: string;
  type: CerneQuestionType;
  label: string;
  category: 'Narrative' | 'Sensemaking' | 'Demographics' | 'Survey';
  group: 'basic' | 'additional';
  description: string;
  icon: 'AlignLeft' | 'Smile' | 'SlidersHorizontal' | 'Triangle' | 'Users' | 'CircleDot' | 'CheckSquare';
  defaultPreferNotToSay?: boolean;
}

export const CERNE_QUESTION_TYPES: QuestionTypeInfo[] = [
  // Basic Elements
  {
    id: 'story-question',
    type: 'story-question',
    label: 'Story Question',
    category: 'Narrative',
    group: 'basic',
    description: 'Prompts participants to share their lived experience',
    icon: 'AlignLeft'
  },
  {
    id: 'emotional-response',
    type: 'emotional-response',
    label: 'Emotional Response',
    category: 'Narrative',
    group: 'basic',
    description: 'Captures how participants feel about the shared story',
    icon: 'Smile'
  },
  {
    id: 'slider',
    type: 'slider',
    label: 'Slider',
    category: 'Sensemaking',
    group: 'basic',
    description: 'Continuous scale between two opposing perspectives',
    icon: 'SlidersHorizontal'
  },
  {
    id: 'triangle',
    type: 'triangle',
    label: 'Triangle',
    category: 'Sensemaking',
    group: 'basic',
    description: 'Barycentric balance between three competing qualities',
    icon: 'Triangle'
  },
  {
    id: 'participant-questions',
    type: 'participant-questions',
    label: 'Participant Questions',
    category: 'Demographics',
    group: 'basic',
    description: 'Participant demographics or context question',
    icon: 'Users',
    defaultPreferNotToSay: true
  },
  // Additional Elements
  {
    id: 'multiple-choice',
    type: 'multiple-choice',
    label: 'Multiple Choice',
    category: 'Survey',
    group: 'additional',
    description: 'Single-select question with custom options',
    icon: 'CircleDot',
    defaultPreferNotToSay: false
  },
  {
    id: 'checkboxes',
    type: 'checkboxes',
    label: 'Checkboxes',
    category: 'Survey',
    group: 'additional',
    description: 'Multi-select options for participants',
    icon: 'CheckSquare',
    defaultPreferNotToSay: false
  }
];

import { getEmotionalResponseDefaults } from "@/utils/formDefaultTranslations";
import { generateUUID } from "@/utils/uuid";

export function createDefaultQuestion(
  typeOrId: CerneQuestionType | string,
  preferNotToSayOverride?: boolean,
  lang: string = 'en'
): CerneBuilderQuestion {
  const id = generateUUID();
  const matchedInfo = CERNE_QUESTION_TYPES.find((q) => q.id === typeOrId);
  const actualType = matchedInfo ? matchedInfo.type : (typeOrId as CerneQuestionType);
  const includePreferNotToSay = preferNotToSayOverride ?? (matchedInfo?.defaultPreferNotToSay || false);

  switch (actualType) {
    case 'story-question':
      return {
        id,
        type: 'story-question',
        label: 'Please share an experience or story that highlights your perspective...',
        placeholder: 'Describe what happened, who was involved, and how it affected you...',
        required: true,
      };
    case 'emotional-response': {
      const defaults = getEmotionalResponseDefaults(lang);
      return {
        id,
        type: 'emotional-response',
        label: defaults.label,
        required: true,
        options: defaults.options,
        includePreferNotToSay: false,
      };
    }
    case 'slider':
      return {
        id,
        type: 'slider',
        label: 'Slider Question',
        theme: '',
        required: true,
        sliderConfig: {
          leftLabel: 'Left Label',
          rightLabel: 'Right Label',
          min: 0,
          max: 100,
          step: 1,
          defaultValue: 50,
        },
      };
    case 'triangle':
      return {
        id,
        type: 'triangle',
        label: 'Triangle Question',
        theme: '',
        required: true,
        triangleConfig: {
          topLabel: 'Top Label',
          bottomLeftLabel: 'Bottom Left Label',
          bottomRightLabel: 'Bottom Right Label',
        },
      };
    case 'checkboxes':
      return {
        id,
        type: 'checkboxes',
        label: 'Checkboxes',
        required: false,
        includePreferNotToSay: false,
        options: [
          { id: generateUUID(), label: 'Option 1' },
          { id: generateUUID(), label: 'Option 2' },
          { id: generateUUID(), label: 'Option 3' },
        ],
      };
    case 'participant-questions':
      return {
        id,
        type: 'participant-questions',
        label: 'Participant Questions',
        required: false,
        includePreferNotToSay: preferNotToSayOverride ?? true,
        options: [
          { id: generateUUID(), label: 'Choice 1' },
          { id: generateUUID(), label: 'Choice 2' },
          { id: generateUUID(), label: 'Choice 3' },
        ],
      };
    case 'multiple-choice':
    default:
      return {
        id,
        type: 'multiple-choice',
        label: matchedInfo?.label || 'Multiple Choice',
        required: false,
        includePreferNotToSay,
        options: [
          { id: generateUUID(), label: 'Choice 1' },
          { id: generateUUID(), label: 'Choice 2' },
          { id: generateUUID(), label: 'Choice 3' },
        ],
      };
  }
}
