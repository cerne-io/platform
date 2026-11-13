import { StoryData } from "./types";
import {
  MAX_ADDITIONAL_COMMENTS_LENGTH,
  MAX_EMOTIONAL_RESPONSE_LENGTH,
  MAX_LABEL_LENGTH,
  MAX_PARTICIPANT_RESPONSE_LENGTH,
  MAX_QUESTION_TEXT_LENGTH,
  MAX_STORY_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  sanitizeText,
} from "./validationSchemas";
import { debugError, debugLog } from "@/utils/debugLogger";

/**
 * Builds the sanitized story + response payload shared by public and admin submit endpoints.
 */
export function buildStorySubmissionPayload(formData: StoryData) {
  const title = sanitizeText(formData.title || "").substring(0, MAX_TITLE_LENGTH);
  const text = sanitizeText(formData.text || "").substring(0, MAX_STORY_TEXT_LENGTH);
  const emotionalResponse = sanitizeText(formData.emotionalResponse || "").substring(
    0,
    MAX_EMOTIONAL_RESPONSE_LENGTH
  );
  const additionalComments = formData.additionalComments
    ? sanitizeText(formData.additionalComments).substring(
        0,
        MAX_ADDITIONAL_COMMENTS_LENGTH
      )
    : undefined;

  const sliderResponses = (formData.sliderResponses || []).map((slider) => ({
    questionId: slider.questionId,
    questionText: sanitizeText(slider.questionText || "").substring(
      0,
      MAX_QUESTION_TEXT_LENGTH
    ),
    value: slider.responseType === "skipped" ? null : slider.value ?? null,
    responseType: slider.responseType === "skipped" ? "skipped" : "answered",
    leftLabel: slider.leftLabel
      ? sanitizeText(slider.leftLabel).substring(0, MAX_LABEL_LENGTH)
      : undefined,
    rightLabel: slider.rightLabel
      ? sanitizeText(slider.rightLabel).substring(0, MAX_LABEL_LENGTH)
      : undefined,
  }));

  const triangleResponses = (formData.triangleResponses || []).map((triangle) => ({
    questionId: triangle.questionId,
    questionText: sanitizeText(triangle.questionText || "").substring(
      0,
      MAX_QUESTION_TEXT_LENGTH
    ),
    topLabel: triangle.topLabel
      ? sanitizeText(triangle.topLabel).substring(0, MAX_LABEL_LENGTH)
      : undefined,
    bottomLeftLabel: triangle.bottomLeftLabel
      ? sanitizeText(triangle.bottomLeftLabel).substring(0, MAX_LABEL_LENGTH)
      : undefined,
    bottomRightLabel: triangle.bottomRightLabel
      ? sanitizeText(triangle.bottomRightLabel).substring(0, MAX_LABEL_LENGTH)
      : undefined,
    xPosition: triangle.responseType === "skipped" ? null : triangle.xPosition ?? null,
    yPosition: triangle.responseType === "skipped" ? null : triangle.yPosition ?? null,
    responseType: triangle.responseType === "skipped" ? "skipped" : "answered",
  }));

  const participantResponses = (formData.participantResponses || []).map((item) => ({
    questionId: String(item.questionId),
    questionText: sanitizeText(item.questionText || "").substring(
      0,
      MAX_QUESTION_TEXT_LENGTH
    ),
    response: item.choiceText
      ? sanitizeText(item.choiceText).substring(0, MAX_PARTICIPANT_RESPONSE_LENGTH)
      : "",
  }));

  return {
    title,
    text,
    emotionalResponse: emotionalResponse || null,
    additionalComments: additionalComments || null,
    hasAudio: Boolean(formData.hasAudio),
    sliderResponses,
    triangleResponses,
    participantResponses,
  };
}

/**
 * Handles form submission for public (unauthenticated) respondents
 * via the transactional /api/public/submit-story endpoint.
 */
export const submitPublicForm = async (
  formData: StoryData
): Promise<boolean | string> => {
  if (!formData || !formData.formId) {
    debugError("Missing form data or formId for public submission");
    return false;
  }

  try {
    const res = await fetch("/api/public/submit-story", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId: formData.formId,
        ...buildStorySubmissionPayload(formData),
      }),
    });

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const body = (await res.json()) as { error?: string };
        if (body?.error) errMsg = body.error;
      } catch {
        // Ignore JSON parse errors
      }
      debugError("Public form submission failed:", errMsg);
      return false;
    }

    debugLog("Public story submitted successfully via /api/public/submit-story");
    return true;
  } catch (error) {
    debugError("Error in public form submission:", error);
    return false;
  }
};
