import { QuestionType } from '@/services/formConfig/questionTypeService';
import { SliderQuestion, TriangleQuestion } from '@/services/types/designTypes';

/**
 * Filters slider and triangle question arrays based on the saved QuestionType.
 *
 * Rules:
 *  - 'slider'   → slider questions only, triangles = []
 *  - 'triangle' → triangle questions only, sliders = []
 *  - 'both'     → both arrays unchanged
 *  - null/undefined → backward-compat: pass both through unchanged
 */
export function filterQuestionsByType(
  sliderQuestions: SliderQuestion[],
  triangleQuestions: TriangleQuestion[],
  questionType: QuestionType | null | undefined
): { sliderQuestions: SliderQuestion[]; triangleQuestions: TriangleQuestion[] } {
  if (!questionType) {
    // Legacy projects with no questionType stored: keep whatever exists
    return { sliderQuestions, triangleQuestions };
  }
  return {
    sliderQuestions: questionType === 'triangle' ? [] : sliderQuestions,
    triangleQuestions: questionType === 'slider' ? [] : triangleQuestions,
  };
}
