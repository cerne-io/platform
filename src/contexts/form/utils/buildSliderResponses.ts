import { debugLog } from "@/utils/debugLogger";

import { SliderQuestion } from "@/services/types/designTypes";

export function buildSliderResponses(sliderQuestions: SliderQuestion[], sliderValues: Record<string | number, number | null | "n/a">, touchedSliders: Set<number>) {
  debugLog('[buildSliderResponses] Building responses from questions:', sliderQuestions?.map(q => ({
    id: q.id,
    question: q.question?.substring(0, 50),
    leftLabel: q.leftLabel,
    rightLabel: q.rightLabel
  })));

  return sliderQuestions.map(question => {
    const value = sliderValues[question.id];
    const numericValue = typeof value === 'number' ? value : null;

    // Ensure we have actual question text, not placeholders
    const q = question as unknown as Record<string, unknown>;
    const questionText = (q.question as string) || (q.questionText as string) || '';
    const leftLabel = (q.leftLabel as string) || (q.left_label as string) || '';
    const rightLabel = (q.rightLabel as string) || (q.right_label as string) || '';

    // Log warning if we detect placeholder text
    if (questionText.match(/^Slider Question \d+$/)) {
      debugLog(`[buildSliderResponses] Placeholder text detected for question ${question.id}: "${questionText}"`);
    }

    const response = {
      questionId: question.id,
      questionText,
      leftLabel,
      rightLabel,
      value: numericValue,
      responseType: touchedSliders.has(question.id) ? 'answered' : 'skipped'
    };

    debugLog(`[buildSliderResponses] Built response for question ${question.id}:`, JSON.stringify({
      questionText: response.questionText?.substring(0, 50),
      hasLeftLabel: !!response.leftLabel,
      hasRightLabel: !!response.rightLabel,
      value: response.value
    }));

    return response;
  });
}
