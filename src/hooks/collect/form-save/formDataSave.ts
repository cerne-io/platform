
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { debugLog, debugError } from "@/utils/debugLogger";
import { PUBLIC_ACTIVITY_IDS } from "@/services/constants/publicFormActivityIds";

// Save directly to activity_responses with check for existing record
export const saveDirectToActivityResponses = async (
  projectId: string,
  phaseId: string,
  stepId: string,
  activityId: string,
  response: unknown
): Promise<boolean> => {
  try {
    debugLog(`Saving to ${activityId} for project ${projectId}`);

    // First check if a record already exists
    const { data: existingData, error: fetchError } = await supabase
      .from('activity_responses')
      .select('id')
      .eq('ar_project_id', projectId)
      .eq('ar_phase_id', phaseId)
      .eq('ar_step_id', stepId)
      .eq('ar_activity_id', activityId)
      .maybeSingle();

    if (fetchError) {
      debugError(`Error checking for existing record for ${activityId}:`, fetchError);
      return false;
    }

    const timestamp = new Date().toISOString();

    if (existingData) {
      // Update existing record
      debugLog(`Updating existing record for ${activityId}`);
      const { error: updateError } = await supabase
        .from('activity_responses')
        .update({
          ar_response: response as unknown as Json,
          updated_at: timestamp
        })
        .eq('id', existingData.id);

      if (updateError) {
        debugError(`Error updating ${activityId}:`, updateError);
        return false;
      }

      debugLog(`Successfully updated ${activityId} with ID:`, existingData.id);
      return true;
    } else {
      // Insert new record
      debugLog(`Creating new record for ${activityId}`);
      const { data, error } = await supabase
        .from('activity_responses')
        .insert({
          ar_project_id: projectId,
          ar_phase_id: phaseId,
          ar_step_id: stepId,
          ar_activity_id: activityId,
          ar_response: response as unknown as Json,
          updated_at: timestamp
        })
        .select('id')
        .maybeSingle();

      if (error) {
        debugError(`Error saving to ${activityId}:`, error);
        return false;
      }

      debugLog(`Successfully saved to ${activityId} with ID:`, data?.id);
      return true;
    }
  } catch (error) {
    debugError(`Failed to save to ${activityId}:`, error);
    return false;
  }
};

// Default placeholder that should NOT be saved
const INVALID_STORY_PLACEHOLDER = "Please share your story with us.";

// Save story question to activity responses
export const saveStoryQuestion = async (
  projectId: string,
  storyQuestion: string
): Promise<boolean> => {
  const trimmed = storyQuestion?.trim();

  // Block saving empty or default placeholder story questions
  if (!trimmed || trimmed === INVALID_STORY_PLACEHOLDER) {
    debugError("Cannot save empty or default placeholder story question");
    return false;
  }

  return saveDirectToActivityResponses(
    projectId,
    'collection',
    'public-form',
    PUBLIC_ACTIVITY_IDS.STORY_QUESTION,
    { storyQuestion: trimmed }
  );
};

// Save slider questions to activity responses
export const saveSliderQuestions = async (
  projectId: string,
  sliderQuestions: Record<string, unknown>[]
): Promise<boolean> => {
  // Clean and format slider questions
  const formattedSliderQuestions = sliderQuestions.map(q => ({
    id: q.id,
    theme: q.theme || "General",
    question: typeof q.question === 'string' ? q.question.trim() : "",
    leftLabel: typeof q.leftLabel === 'string' ? q.leftLabel.trim() : "Not at all",
    rightLabel: typeof q.rightLabel === 'string' ? q.rightLabel.trim() : "Very much",
    sliderValue: q.sliderValue || 50
  }));

  return saveDirectToActivityResponses(
    projectId,
    'collection',
    'public-form',
    PUBLIC_ACTIVITY_IDS.SLIDER_QUESTIONS,
    { sliderQuestions: formattedSliderQuestions }
  );
};

// Save participant questions to activity responses
export const saveParticipantQuestions = async (
  projectId: string,
  participantQuestions: Record<string, unknown>[]
): Promise<boolean> => {
  // Clean and format participant questions
  const formattedParticipantQuestions = participantQuestions.map(q => ({
    id: q.id,
    label: typeof q.label === 'string' ? q.label.trim() : "",
    checked: !!q.checked,
    choices: Array.isArray(q.choices)
      ? (q.choices as Record<string, unknown>[]).map((c) => ({
        id: c.id,
        label: typeof c.label === 'string' ? (c.label as string).trim() : ""
      }))
      : []
  }));

  return saveDirectToActivityResponses(
    projectId,
    'collection',
    'public-form',
    PUBLIC_ACTIVITY_IDS.PARTICIPANT_QUESTIONS,
    { participantQuestions: formattedParticipantQuestions }
  );
};

// Save legacy format for backward compatibility
export const saveLegacyFormConfig = async (
  projectId: string,
  storyQuestion: string,
  sliderQuestions: Record<string, unknown>[],
  participantQuestions: Record<string, unknown>[]
): Promise<boolean> => {
  const trimmedStoryQuestion = storyQuestion?.trim();

  // Block saving empty or default placeholder story questions
  if (!trimmedStoryQuestion || trimmedStoryQuestion === INVALID_STORY_PLACEHOLDER) {
    debugError("Cannot save legacy form config with empty or default placeholder story question");
    return false;
  }

  // Clean and format slider questions
  const formattedSliderQuestions = sliderQuestions.map(q => ({
    id: q.id,
    theme: q.theme || "General",
    question: typeof q.question === 'string' ? q.question.trim() : "",
    leftLabel: typeof q.leftLabel === 'string' ? q.leftLabel.trim() : "Not at all",
    rightLabel: typeof q.rightLabel === 'string' ? q.rightLabel.trim() : "Very much",
    sliderValue: q.sliderValue || 50
  }));

  // Clean and format participant questions
  const formattedParticipantQuestions = participantQuestions.map(q => ({
    id: q.id,
    label: typeof q.label === 'string' ? q.label.trim() : "",
    checked: !!q.checked,
    choices: Array.isArray(q.choices)
      ? (q.choices as Record<string, unknown>[]).map((c) => ({
        id: c.id,
        label: typeof c.label === 'string' ? (c.label as string).trim() : ""
      }))
      : []
  }));

  return saveDirectToActivityResponses(
    projectId,
    'collection',
    'public-form',
    PUBLIC_ACTIVITY_IDS.LEGACY_FORM_CONFIG,
    {
      storyQuestion: trimmedStoryQuestion,
      sliderQuestions: formattedSliderQuestions,
      participantQuestions: formattedParticipantQuestions
    }
  );
};
