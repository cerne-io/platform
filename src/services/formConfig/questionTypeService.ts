import { saveDirectToActivityResponses } from "@/hooks/collect/form-save/formDataSave";
import { supabase } from "@/integrations/supabase/client";
import { debugError, debugLog } from "@/utils/debugLogger";
import { PUBLIC_ACTIVITY_IDS } from "@/services/publicForm/constants";


export type QuestionType = 'slider' | 'triangle' | 'both';

/**
 * Get the selected question type for a project
 */
export const getQuestionType = async (projectId: string): Promise<QuestionType | null> => {
  try {
    // 1. Try fetching from the canonical location first (authenticated)
    const { data, error } = await supabase
      .from('activity_responses')
      .select('ar_response')
      .eq('ar_project_id', projectId)
      .eq('ar_phase_id', 'design')
      .eq('ar_step_id', 'questions')
      .eq('ar_activity_id', 'question-type')
      .maybeSingle();

    if (!error && data?.ar_response) {
      const response = data.ar_response as { questionType?: QuestionType };
      if (response.questionType) {
        return response.questionType;
      }
    }

    // 2. Fallback: Try fetching from the public location (collection/public-form)
    // This allows public forms to read the configuration
    debugLog("Checking public question type location");
    const { data: publicData, error: publicError } = await supabase
      .from('activity_responses')
      .select('ar_response')
      .eq('ar_project_id', projectId)
      .eq('ar_phase_id', 'collection')
      .eq('ar_step_id', 'public-form')
      .eq('ar_activity_id', PUBLIC_ACTIVITY_IDS.QUESTION_TYPE)
      .maybeSingle();

    if (!publicError && publicData?.ar_response) {
      const response = publicData.ar_response as { questionType?: QuestionType };
      if (response.questionType) {
        return response.questionType;
      }
    }

    return null;
  } catch (error) {
    debugError('Failed to fetch question type:', error);
    return null;
  }
};

/**
 * Save the selected question type for a project
 */
export const saveQuestionType = async (
  projectId: string,
  questionType: QuestionType
): Promise<boolean> => {
  try {
    // 1. Save to canonical location
    const canonicalResult = await saveDirectToActivityResponses(
      projectId,
      'design',
      'questions',
      'question-type',
      { questionType }
    );

    if (!canonicalResult) return false;

    // 2. Also save to public location for access by public forms
    // We use a direct insert/update here or reuse saveDirectToActivityResponses if appropriate
    // Ideally we should use the same service but targeting the public location
    await saveDirectToActivityResponses(
      projectId,
      'collection',
      'public-form',
      PUBLIC_ACTIVITY_IDS.QUESTION_TYPE,
      { questionType }
    );

    return true;
  } catch (error) {
    debugError('Error saving question type:', error);
    return false;
  }
};
