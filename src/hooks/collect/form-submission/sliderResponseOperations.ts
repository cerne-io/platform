
import { supabase } from "@/integrations/supabase/client";
import { StoryData, SliderResponseData } from './types';
import { sanitizeText, MAX_QUESTION_TEXT_LENGTH, MAX_LABEL_LENGTH, MIN_SLIDER_VALUE, MAX_SLIDER_VALUE, getSafeIntegerId } from './validationSchemas';
import { debugLog, debugError, debugWarn } from "@/utils/debugLogger";

/**
 * Save slider responses to the database
 * @param formData The form submission data containing slider responses
 * @param storyId The ID of the story these responses belong to
 * @returns Promise<boolean> resolving to true if all responses were confirmed saved or none existed, false otherwise
 */
export const saveSliderResponses = async (
  formData: StoryData,
  storyId: string
): Promise<boolean> => {
  try {
    if (!formData.sliderResponses || formData.sliderResponses.length === 0) {
      debugLog("No slider responses to save");
      return true;
    }

    const sliderInserts = prepareSliderResponsesData(formData, storyId);
    if (sliderInserts.length === 0) {
      return true;
    }

    const preparedItems = sliderInserts.map(item => ({
      ...item,
      question_id: getSafeIntegerId(item.question_id),
      story_id: storyId,
    }));

    const { error } = await supabase
      .from('slider_responses')
      .insert(preparedItems);

    if (error) {
      debugError("Errors saving slider responses:", error);
      return false;
    }

    debugLog(`Successfully saved ${sliderInserts.length} slider responses`);
    return true;
  } catch (error) {
    debugError("Error in saveSliderResponses:", error);
    return false;
  }
};

/**
 * Prepare slider response data from form submission for database insertion
 * @param formData The form submission data containing slider responses
 * @param storyId The ID of the story these responses belong to
 * @returns Array of prepared slider response data objects
 */
export const prepareSliderResponsesData = (formData: StoryData, storyId: string): SliderResponseData[] => {
  const sliderInserts: SliderResponseData[] = [];

  if (formData.sliderResponses && formData.sliderResponses.length > 0) {
    debugLog(`Processing ${formData.sliderResponses.length} slider responses for story ${storyId}`);

    formData.sliderResponses.forEach(slider => {
      // Skip sliders with null values only if they are marked as answered (invalid state)
      // If they are marked as skipped, we want to save them even with null values
      if (slider.value === null && slider.responseType === 'answered') {
        debugLog(`Skipping slider ${slider.questionId} with null value but marked as answered`);
        return;
      }

      // Defense-in-depth: Sanitize and validate slider data
      const sanitizedQuestionText = sanitizeText(slider.questionText || '').substring(0, MAX_QUESTION_TEXT_LENGTH);
      const sanitizedLeftLabel = slider.leftLabel ? sanitizeText(slider.leftLabel).substring(0, MAX_LABEL_LENGTH) : undefined;
      const sanitizedRightLabel = slider.rightLabel ? sanitizeText(slider.rightLabel).substring(0, MAX_LABEL_LENGTH) : undefined;

      // Skip if question text is empty
      if (!sanitizedQuestionText) {
        debugWarn(`Skipping slider ${slider.questionId} with empty question text`);
        return;
      }

      // Validate and clamp slider value to acceptable range
      let validatedValue = slider.value;
      if (validatedValue !== null && validatedValue !== undefined) {
        validatedValue = Math.max(MIN_SLIDER_VALUE, Math.min(MAX_SLIDER_VALUE, Number(validatedValue)));
      } else {
        validatedValue = null;
      }

      sliderInserts.push({
        story_id: storyId,
        question_id: slider.questionId,
        question_text: sanitizedQuestionText,
        value: validatedValue,
        response_type: slider.responseType || "answered",
        left_label: sanitizedLeftLabel,
        right_label: sanitizedRightLabel,
        sr_project_id: formData.projectId || undefined,
        form_id: formData.formId || undefined
      });

      debugLog(`Prepared slider response for question ${slider.questionId}: ${sanitizedQuestionText}, value: ${validatedValue}`);
    });
  }

  return sliderInserts;
};
