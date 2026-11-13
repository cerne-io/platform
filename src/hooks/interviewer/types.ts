import { TriangleQuestion } from "@/services/types/designTypes";

export interface UseInterviewerOptions {
    projectContext?: string;
    storyQuestion?: string;
    projectId?: string;
    sliderQuestions?: Array<{
        id: number;
        theme?: string;
        question: string;
        leftLabel: string;
        rightLabel: string;
    }>;
    triangleQuestions?: TriangleQuestion[];
    participantQuestions?: Array<{
        id: string;
        label: string;
        choices?: Array<{ id: string; label: string }>;
        questionType?: 'multiple-choice' | 'checkboxes';
    }>;
    isPublic?: boolean;
    formId?: string;
    language?: string;
}

export type InterviewPhase =
    | 'story'
    | 'metadata_title'
    | 'metadata_emotion'
    | 'sliders'
    | 'triangle'
    | 'participant'
    | 'additional_comments'
    | 'complete';
