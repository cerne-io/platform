
import { debugLog } from "@/utils/debugLogger";

import { TriangleQuestion } from "@/services/types/designTypes";

export function buildTriangleResponses(triangleQuestions: TriangleQuestion[], triangleValues: Record<string | number, { x: number, y: number } | "n/a">, touchedTriangles: Set<number>) {
  debugLog('[buildTriangleResponses] Building responses from questions:', triangleQuestions?.map(q => ({
    id: q.id,
    question: q.question?.substring(0, 50),
    topLabel: q.topLabel,
    bottomLeftLabel: q.bottomLeftLabel,
    bottomRightLabel: q.bottomRightLabel
  })));

  return triangleQuestions.map(question => {
    const value = triangleValues[question.id];

    // Parse the position value
    let xPosition: number | null = null;
    let yPosition: number | null = null;

    if (value && typeof value === 'object' && 'x' in value && 'y' in value) {
      xPosition = value.x;
      yPosition = value.y;
    }

    // Ensure we have actual question text, not placeholders
    const q = question as unknown as Record<string, unknown>;
    const questionText = (q.question as string) || (q.questionText as string) || '';
    const topLabel = (q.topLabel as string) || (q.top_label as string) || '';
    const bottomLeftLabel = (q.bottomLeftLabel as string) || (q.bottom_left_label as string) || '';
    const bottomRightLabel = (q.bottomRightLabel as string) || (q.bottom_right_label as string) || '';

    // Log warning if we detect placeholder text
    if (questionText.match(/^Triangle Question \d+$/)) {
      debugLog(`[buildTriangleResponses] Placeholder text detected for question ${question.id}: "${questionText}"`);
    }

    const response = {
      questionId: question.id,
      questionText,
      topLabel,
      bottomLeftLabel,
      bottomRightLabel,
      xPosition,
      yPosition,
      responseType: touchedTriangles.has(question.id) ? 'answered' : 'skipped'
    };

    debugLog(`[buildTriangleResponses] Built response for question ${question.id}:`, JSON.stringify({
      questionText: response.questionText?.substring(0, 50),
      hasTopLabel: !!response.topLabel,
      hasBottomLeftLabel: !!response.bottomLeftLabel,
      hasBottomRightLabel: !!response.bottomRightLabel,
      xPosition: response.xPosition,
      yPosition: response.yPosition
    }));

    return response;
  });
}
