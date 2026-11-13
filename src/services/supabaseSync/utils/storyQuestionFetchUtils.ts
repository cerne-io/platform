
import { supabase } from "@/integrations/supabase/client";

import { processAIResponse } from "../../storyQuestionSyncBase";
import { debugLog, debugError, debugWarn } from "@/utils/debugLogger";
import { safeParseStoryQuestion } from "@/utils/formLocalization";

/**
 * Find a story question in all activity_responses
 */
export const findStoryQuestionInResponses = async (
  projectId: string
): Promise<string | Record<string, string> | null> => {
  debugLog(`Looking for story question in activity_responses for project ${projectId}`);

  try {
    // First try to get directly from collection/story-questions/story-questions (new consolidated path)
    const { data: consolidatedData, error: consolidatedError } = await supabase
      .from('activity_responses')
      .select('ar_response')
      .eq('ar_project_id', projectId)
      .eq('ar_phase_id', 'collection')
      .eq('ar_step_id', 'story-questions')
      .eq('ar_activity_id', 'story-questions')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (consolidatedError) {
      debugError(`Error fetching from consolidated path: ${consolidatedError.message}`);
    } else if (consolidatedData?.ar_response) {
      const responseData = consolidatedData.ar_response as Record<string, unknown>;
      if (responseData.question) {
        if (typeof responseData.question === 'string' || typeof responseData.question === 'object') {
          debugLog(`Found story question in consolidated path`);
          return responseData.question as string | Record<string, string>;
        }
      }
    }

    // Next try public-form/public-story-questions
    const { data: publicData, error: publicError } = await supabase
      .from('activity_responses')
      .select('ar_response')
      .eq('ar_project_id', projectId)
      .eq('ar_phase_id', 'collection')
      .eq('ar_step_id', 'public-form')
      .eq('ar_activity_id', 'public-story-questions')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (publicError) {
      debugError(`Error fetching from public path: ${publicError.message}`);
    } else if (publicData?.ar_response) {
      const responseData = publicData.ar_response as Record<string, unknown>;
      if (responseData.question) {
        if (typeof responseData.question === 'string' || typeof responseData.question === 'object') {
          debugLog(`Found story question in public path`);
          return responseData.question as string | Record<string, string>;
        }
      }
    }

    // Legacy: Try direct story-question from collection phase
    const { data: legacyData, error: legacyError } = await supabase
      .from('activity_responses')
      .select('ar_response')
      .eq('ar_project_id', projectId)
      .eq('ar_phase_id', 'collection')
      .eq('ar_step_id', 'story-question')
      .eq('ar_activity_id', 'story-question')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (legacyError) {
      debugError(`Error fetching from legacy path: ${legacyError.message}`);
    } else if (legacyData?.ar_response) {
      const responseData = legacyData.ar_response as Record<string, unknown>;
      if (responseData.question) {
        if (typeof responseData.question === 'string' || typeof responseData.question === 'object') {
          debugLog(`Found story question in legacy path`);
          return responseData.question as string | Record<string, string>;
        }
      }
    }

    return null;
  } catch (error) {
    debugError(`Error in findStoryQuestionInResponses: ${error}`);
    return null;
  }
};

/**
 * Fetch from public form configuration
 */
export const fetchFromPublicFormConfiguration = async (
  projectId: string
): Promise<string | Record<string, string> | null> => {
  debugLog(`Looking for story question in public-form/story-question for project ${projectId}`);

  try {
    const { data, error } = await supabase
      .from('activity_responses')
      .select('ar_response')
      .eq('ar_project_id', projectId)
      .eq('ar_phase_id', 'collection')
      .eq('ar_step_id', 'public-form')
      .eq('ar_activity_id', 'story-question')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      debugError(`Error fetching from public form configuration: ${error.message}`);
      return null;
    }

    if (!data?.ar_response) {
      return null;
    }

    const responseData = data.ar_response as Record<string, unknown>;

    if (responseData.storyQuestion) {
      if (typeof responseData.storyQuestion === 'string' || typeof responseData.storyQuestion === 'object') {
        debugLog(`Found storyQuestion in public form configuration`);
        return responseData.storyQuestion as string | Record<string, string>;
      }
    }

    return null;
  } catch (error) {
    debugError(`Error in fetchFromPublicFormConfiguration: ${error}`);
    return null;
  }
};

/**
 * Process and validate the extracted question
 */
export const processExtractedQuestion = (
  extractedQuestion: string | Record<string, string> | null,
  localQuestion: string | Record<string, string> | null
): string | Record<string, string> => {
  // 1. Process the extracted question if it exists
  if (extractedQuestion) {
    // Defensively parse strings that might be JSON
    const parsedExtracted = safeParseStoryQuestion(extractedQuestion);
    
    if (typeof parsedExtracted === 'string') {
      // CRITICAL: If the string looks like JSON (starts with {), DON'T call processAIResponse
      // as it's destructive and designed for plain AI text.
      if (parsedExtracted.trim().startsWith('{')) {
        debugWarn("[processExtractedQuestion] String looks like JSON but failed to parse. Returning raw to prevent mangling.", parsedExtracted.substring(0, 50));
        return parsedExtracted;
      }

      const processedQuestion = processAIResponse(parsedExtracted);
      if (processedQuestion && processedQuestion.trim().length > 3) {
        return processedQuestion;
      }
    } else {
      // It's already a valid object / translation record
      return parsedExtracted;
    }
  }

  // 2. If no valid extracted question, fall back to local question (also defensively parsed)
  if (localQuestion) {
    const parsedLocal = safeParseStoryQuestion(localQuestion);
    if (typeof parsedLocal === 'string') {
      if (parsedLocal.trim().length > 3) return parsedLocal;
    } else {
      return parsedLocal;
    }
  }

  // 3. If all else fails, return the default or empty
  return "";
};
