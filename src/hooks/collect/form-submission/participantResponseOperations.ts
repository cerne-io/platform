
import { supabase } from "@/integrations/supabase/client";
import { deleteStoryWithRetries } from "@/services/story/deleteStory";
import { StoryData, ParticipantResponseData } from './types';
import { sanitizeText, MAX_QUESTION_TEXT_LENGTH, MAX_PARTICIPANT_RESPONSE_LENGTH } from './validationSchemas';
import { debugLog, debugError } from "@/utils/debugLogger";

export async function rollbackAuthenticatedStory(storyId: string, projectId?: string): Promise<void> {
  await deleteStoryWithRetries(storyId, 1);
  const { queryClient } = await import('@/lib/queryClient');
  const { storiesQueryKey } = await import('@/hooks/queries/useStoriesQuery');
  void queryClient.invalidateQueries({ queryKey: storiesQueryKey(projectId) });
}

/**
 * Save participant data to the database
 * @param formData The form submission data containing participant responses
 * @param storyId The ID of the story these responses belong to
 * @returns Promise<boolean> resolving to true if all responses were confirmed saved or none existed, false otherwise
 */
export const saveParticipantData = async (
  formData: StoryData,
  storyId: string
): Promise<boolean> => {
  try {
    if (!formData.participantResponses || formData.participantResponses.length === 0) {
      debugLog("No participant responses to save");
      return true;
    }

    const participantInserts = prepareParticipantResponsesData(formData, storyId);
    if (participantInserts.length === 0) {
      return true;
    }

    const preparedItems = participantInserts.map(item => ({
      ...item,
      story_id: storyId,
    }));

    const { error } = await supabase
      .from('participant_responses')
      .insert(preparedItems);

    if (error) {
      debugError("Errors saving participant responses:", error);
      return false;
    }

    debugLog(`Successfully saved ${participantInserts.length} participant responses`);
    return true;
  } catch (error) {
    debugError("Error in saveParticipantData:", error);
    return false;
  }
};

/**
 * Prepare participant response data from form submission for database insertion
 * @param formData The form submission data containing participant responses
 * @param storyId The ID of the story these responses belong to
 * @returns Array of prepared participant response data objects
 */
export const prepareParticipantResponsesData = (formData: StoryData, storyId: string): ParticipantResponseData[] => {
  const participantInserts: ParticipantResponseData[] = [];

  if (formData.participantResponses && formData.participantResponses.length > 0) {
    debugLog(`Processing ${formData.participantResponses.length} participant responses`);

    formData.participantResponses.forEach(response => {
      // Defense-in-depth: Sanitize and validate participant response data
      const sanitizedQuestionText = sanitizeText(response.questionText || '').substring(0, MAX_QUESTION_TEXT_LENGTH);
      const sanitizedChoiceText = response.choiceText ? sanitizeText(response.choiceText).substring(0, MAX_PARTICIPANT_RESPONSE_LENGTH) : null;

      participantInserts.push({
        story_id: storyId,
        question_id: response.questionId,
        question_text: sanitizedQuestionText,
        response: sanitizedChoiceText || "", // We save empty string for skipped to avoid null issues if preferred, or null if schema allows
        pr_project_id: formData.projectId,
        form_id: formData.formId
      });

      debugLog(`Prepared participant response: Question: ${sanitizedQuestionText}, Answer: ${sanitizedChoiceText || 'Skipped'}`);
    });
  }

  return participantInserts;
};
