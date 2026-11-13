import { supabase } from "@/integrations/supabase/client";
import { TriangleQuestion } from "../types/designTypes";

import { Json } from "@/integrations/supabase/types";
import { debugLog, debugError } from "@/utils/debugLogger";

const CANONICAL_TRIANGLE_LOCATION = {
  phase: 'design',
  step: 'questions',
  activity: 'triangle-questions'
};

const PUBLIC_FORM_TRIANGLE_LOCATION = {
  phase: 'collection',
  step: 'public-form',
  activity: 'triangle-questions'
};

/**
 * Extracts triangle questions from a response object
 */
const extractTriangleQuestions = (response: Json): TriangleQuestion[] | null => {
  if (!response) return null;

  // Handle direct array
  if (Array.isArray(response)) {
    return response as unknown as TriangleQuestion[];
  }

  // Handle object with triangleQuestions property
  if (typeof response === 'object' && response !== null && 'triangleQuestions' in response) {
    const questions = (response as Record<string, unknown>).triangleQuestions;
    if (Array.isArray(questions)) {
      return questions as unknown as TriangleQuestion[];
    }
  }

  return null;
};

/**
 * Saves triangle questions to the database
 */
export const saveTriangleQuestions = async (
  projectId: string,
  triangleQuestions: TriangleQuestion[]
): Promise<string> => {
  debugLog(`Saving triangle questions for project: ${projectId}, count: ${triangleQuestions.length}`);

  try {
    // Save to canonical location using RPC function
    try {
      debugLog("Using RPC function to save triangle questions to all locations concurrently");
      const [
        { data: rpcData, error: rpcError },
        { error: publicFormError }
      ] = await Promise.all([
        supabase.rpc('insert_activity_response', {
          project_id: projectId,
          phase_id: CANONICAL_TRIANGLE_LOCATION.phase,
          step_id: CANONICAL_TRIANGLE_LOCATION.step,
          activity_id: CANONICAL_TRIANGLE_LOCATION.activity,
          response_data: { triangleQuestions } as unknown as Json
        }),
        supabase.rpc('insert_activity_response', {
          project_id: projectId,
          phase_id: PUBLIC_FORM_TRIANGLE_LOCATION.phase,
          step_id: PUBLIC_FORM_TRIANGLE_LOCATION.step,
          activity_id: PUBLIC_FORM_TRIANGLE_LOCATION.activity,
          response_data: { triangleQuestions } as unknown as Json
        })
      ]);

      if (rpcError) {
        debugError("Error saving triangle questions via RPC:", rpcError);
        throw rpcError;
      }

      if (publicFormError) {
        debugError("Error saving to public form location via RPC:", publicFormError);
      }

      debugLog("Successfully saved triangle questions via RPC:", rpcData);
      if (typeof rpcData === 'object' && rpcData !== null && 'id' in rpcData) {
        return (rpcData as { id: string }).id;
      }
      return "success";
    } catch (error) {
      debugError("RPC method failed, falling back to direct insert:", error);

      // Fallback to direct insert
      const { data, error: insertError } = await supabase
        .from('activity_responses')
        .insert({
          ar_project_id: projectId,
          ar_phase_id: CANONICAL_TRIANGLE_LOCATION.phase,
          ar_step_id: CANONICAL_TRIANGLE_LOCATION.step,
          ar_activity_id: CANONICAL_TRIANGLE_LOCATION.activity,
          ar_response: { triangleQuestions } as unknown as Json
        })
        .select('id')
        .maybeSingle();

      if (insertError) {
        debugError("Error saving triangle questions via direct insert:", insertError);
        throw insertError;
      }

      // Also save to public form location
      try {
        await supabase
          .from('activity_responses')
          .insert({
            ar_project_id: projectId,
            ar_phase_id: PUBLIC_FORM_TRIANGLE_LOCATION.phase,
            ar_step_id: PUBLIC_FORM_TRIANGLE_LOCATION.step,
            ar_activity_id: PUBLIC_FORM_TRIANGLE_LOCATION.activity,
            ar_response: { triangleQuestions } as unknown as Json
          });
      } catch (publicFormError) {
        debugError("Error saving to public form location:", publicFormError);
      }

      debugLog("Successfully saved triangle questions via direct insert:", data);
      return data?.id || "success";
    }
  } catch (error) {
    debugError("Failed to save triangle questions:", error);
    throw error;
  }
};

/**
 * Fetches triangle questions from the database
 */
export const getTriangleQuestions = async (
  projectId: string,
  isTemplateProject: boolean = false
): Promise<TriangleQuestion[] | null> => {
  debugLog("TriangleQuestionsService - Fetching triangle questions for project:", projectId, "isTemplate:", isTemplateProject);

  // Helper to patch legacy default values
  const patchQuestions = (questions: TriangleQuestion[]) => {
    return questions.map(q => {
      // If using old default (50, 50), update to new centroid (50, 66.67)
      if (q.defaultX === 50 && q.defaultY === 50) {
        return { ...q, defaultY: 66.67 };
      }
      return q;
    });
  };

  try {
    // Run all fallback queries in parallel
    const [canonicalResult, publicFormResult] = await Promise.all([
      // Try canonical location first
      supabase
        .from('activity_responses')
        .select('ar_response, created_at')
        .eq('ar_project_id', projectId)
        .eq('ar_phase_id', CANONICAL_TRIANGLE_LOCATION.phase)
        .eq('ar_step_id', CANONICAL_TRIANGLE_LOCATION.step)
        .eq('ar_activity_id', CANONICAL_TRIANGLE_LOCATION.activity)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Try public form location
      supabase
        .from('activity_responses')
        .select('ar_response, created_at')
        .eq('ar_project_id', projectId)
        .eq('ar_phase_id', PUBLIC_FORM_TRIANGLE_LOCATION.phase)
        .eq('ar_step_id', PUBLIC_FORM_TRIANGLE_LOCATION.step)
        .eq('ar_activity_id', PUBLIC_FORM_TRIANGLE_LOCATION.activity)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    // Check results in precedence order
    if (!canonicalResult.error && canonicalResult.data?.ar_response) {
      debugLog("Found triangle questions in canonical location");
      const questions = extractTriangleQuestions(canonicalResult.data.ar_response);
      if (questions && questions.length > 0) {
        debugLog(`Found ${questions.length} triangle questions in canonical location`);
        return patchQuestions(questions);
      }
    }

    if (!publicFormResult.error && publicFormResult.data?.ar_response) {
      debugLog("Found triangle questions in public form location");
      const questions = extractTriangleQuestions(publicFormResult.data.ar_response);
      if (questions && questions.length > 0) {
        debugLog(`Found ${questions.length} triangle questions in public form location`);
        return patchQuestions(questions);
      }
    }

    debugLog("No triangle questions found in any location, returning empty array");
    return [];
  } catch (error) {
    debugError("Failed to fetch triangle questions - CRITICAL ERROR:", error);
    // Even on error, return empty array to ensure something shows up (or doesn't)
    return [];
  }
};
