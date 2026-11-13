
import { supabase } from "@/integrations/supabase/client";
import { StoryData, TriangleResponseData } from './types';
import { sanitizeText, MAX_QUESTION_TEXT_LENGTH, MAX_LABEL_LENGTH, getSafeIntegerId } from './validationSchemas';
import { debugLog, debugError, debugWarn } from "@/utils/debugLogger";

/**
 * Save triangle responses to the database
 * @param formData The form submission data containing triangle responses
 * @param storyId The ID of the story these responses belong to
 * @returns Promise<boolean> resolving to true if all responses were confirmed saved or none existed, false otherwise
 */
export const saveTriangleResponses = async (
  formData: StoryData,
  storyId: string
): Promise<boolean> => {
  try {
    if (!formData.triangleResponses || formData.triangleResponses.length === 0) {
      debugLog("No triangle responses to save");
      return true;
    }

    const triangleInserts = prepareTriangleResponsesData(formData, storyId);
    if (triangleInserts.length === 0) {
      return true;
    }

    const preparedItems = triangleInserts.map(item => ({
      ...item,
      question_id: getSafeIntegerId(item.question_id),
      story_id: storyId,
    }));

    const { error } = await supabase
      .from('triangle_responses')
      .insert(preparedItems);

    if (error) {
      debugError("Errors saving triangle responses:", error);
      return false;
    }

    debugLog(`Successfully saved ${triangleInserts.length} triangle responses`);
    return true;
  } catch (error) {
    debugError("Error in saveTriangleResponses:", error);
    return false;
  }
};

/**
 * Prepare triangle response data from form submission for database insertion
 * @param formData The form submission data containing triangle responses
 * @param storyId The ID of the story these responses belong to
 * @returns Array of prepared triangle response data objects
 */
export const prepareTriangleResponsesData = (formData: StoryData, storyId: string): TriangleResponseData[] => {
  const triangleInserts: TriangleResponseData[] = [];

  if (formData.triangleResponses && formData.triangleResponses.length > 0) {
    debugLog(`Processing ${formData.triangleResponses.length} triangle responses for story ${storyId}`);

    formData.triangleResponses.forEach(triangle => {
      // Skip triangles with null positions only if they are marked as answered (invalid state)
      // If they are marked as skipped, we want to save them even with null positions
      if ((triangle.xPosition === null || triangle.yPosition === null) && triangle.responseType === 'answered') {
        debugLog(`Skipping triangle ${triangle.questionId} with null position but marked as answered`);
        return;
      }

      // Defense-in-depth: Sanitize and validate triangle data
      const sanitizedQuestionText = sanitizeText(triangle.questionText || '').substring(0, MAX_QUESTION_TEXT_LENGTH);
      const sanitizedTopLabel = triangle.topLabel ? sanitizeText(triangle.topLabel).substring(0, MAX_LABEL_LENGTH) : undefined;
      const sanitizedBottomLeftLabel = triangle.bottomLeftLabel ? sanitizeText(triangle.bottomLeftLabel).substring(0, MAX_LABEL_LENGTH) : undefined;
      const sanitizedBottomRightLabel = triangle.bottomRightLabel ? sanitizeText(triangle.bottomRightLabel).substring(0, MAX_LABEL_LENGTH) : undefined;

      // Skip if question text is empty
      if (!sanitizedQuestionText) {
        debugWarn(`Skipping triangle ${triangle.questionId} with empty question text`);
        return;
      }

      // Validate and clamp position values to acceptable range (0-100)
      let validatedX = triangle.xPosition;
      let validatedY = triangle.yPosition;
      if (validatedX !== null) {
        validatedX = Math.max(0, Math.min(100, validatedX));
      }
      if (validatedY !== null) {
        validatedY = Math.max(0, Math.min(100, validatedY));
      }

      triangleInserts.push({
        story_id: storyId,
        question_id: triangle.questionId,
        question_text: sanitizedQuestionText,
        x_position: validatedX,
        y_position: validatedY,
        response_type: triangle.responseType || "answered",
        top_label: sanitizedTopLabel,
        bottom_left_label: sanitizedBottomLeftLabel,
        bottom_right_label: sanitizedBottomRightLabel,
        tr_project_id: formData.projectId,
        form_id: formData.formId
      });

      debugLog(`Prepared triangle response for question ${triangle.questionId}: ${sanitizedQuestionText}, position: (${validatedX}, ${validatedY})`);
    });
  }

  return triangleInserts;
};
