import { supabase } from "@/integrations/supabase/client";
import { SliderQuestion } from "../types/designTypes";
import { PUBLIC_ACTIVITY_IDS } from "./constants";
import { Json } from "@/integrations/supabase/types";
import { cleanSliderQuestion, extractSliderQuestions } from "./utils";
import { CANONICAL_SLIDER_LOCATION, PUBLIC_FORM_SLIDER_LOCATION } from "@/services/supabaseSync/migrations/sliderQuestionsMigration";
import { FetchActivityResponseResult } from "@/services/supabaseSync/types/responseTypes";
import { debugLog, debugError } from "@/utils/debugLogger";

export const saveSliderQuestions = async (projectId: string, sliderQuestions: SliderQuestion[]): Promise<string> => {
  debugLog(`Saving slider questions for project: ${projectId}, count: ${sliderQuestions.length}`);
  try {
    // Make sure we have clean slider questions data
    const cleanedQuestions = sliderQuestions.map(cleanSliderQuestion);

    // Try to use the RPC function to bypass RLS
    try {
      debugLog("Using RPC function to save slider questions to all locations concurrently");
      const [
        { data: rpcData, error: rpcError },
        { error: publicFormError },
        { error: legacyError }
      ] = await Promise.all([
        supabase.rpc('insert_activity_response', {
          project_id: projectId,
          phase_id: CANONICAL_SLIDER_LOCATION.phase,
          step_id: CANONICAL_SLIDER_LOCATION.step,
          activity_id: CANONICAL_SLIDER_LOCATION.activity,
          response_data: { sliderQuestions: cleanedQuestions } as unknown as Json
        }),
        supabase.rpc('insert_activity_response', {
          project_id: projectId,
          phase_id: PUBLIC_FORM_SLIDER_LOCATION.phase,
          step_id: PUBLIC_FORM_SLIDER_LOCATION.step,
          activity_id: PUBLIC_FORM_SLIDER_LOCATION.activity,
          response_data: { sliderQuestions: cleanedQuestions } as unknown as Json
        }),
        supabase.rpc('insert_activity_response', {
          project_id: projectId,
          phase_id: 'collection',
          step_id: 'public-form',
          activity_id: PUBLIC_ACTIVITY_IDS.LEGACY_FORM_CONFIG,
          response_data: { sliderQuestions: cleanedQuestions } as unknown as Json
        })
      ]);

      if (rpcError) {
        debugError("Error saving slider questions via RPC:", rpcError);
        throw rpcError;
      }

      if (publicFormError) {
        debugError("Error saving to public form location via RPC:", publicFormError);
      }

      if (legacyError) {
        debugError("Error saving to legacy location via RPC:", legacyError);
      }

      debugLog("Successfully saved slider questions via RPC:", rpcData);
      // Check if rpcData exists and has an id property before accessing it
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
          ar_phase_id: CANONICAL_SLIDER_LOCATION.phase,
          ar_step_id: CANONICAL_SLIDER_LOCATION.step,
          ar_activity_id: CANONICAL_SLIDER_LOCATION.activity,
          ar_response: { sliderQuestions: cleanedQuestions } as unknown as Json
        })
        .select('id')
        .maybeSingle();

      if (insertError) {
        debugError("Error saving slider questions via direct insert:", insertError);
        throw insertError;
      }

      // Also save to public form location
      try {
        await Promise.all([
          supabase
            .from('activity_responses')
            .insert({
              ar_project_id: projectId,
              ar_phase_id: PUBLIC_FORM_SLIDER_LOCATION.phase,
              ar_step_id: PUBLIC_FORM_SLIDER_LOCATION.step,
              ar_activity_id: PUBLIC_FORM_SLIDER_LOCATION.activity,
              ar_response: { sliderQuestions: cleanedQuestions } as unknown as Json
            }),

          supabase
            .from('activity_responses')
            .insert({
              ar_project_id: projectId,
              ar_phase_id: 'collection',
              ar_step_id: 'public-form',
              ar_activity_id: PUBLIC_ACTIVITY_IDS.LEGACY_FORM_CONFIG,
              ar_response: { sliderQuestions: cleanedQuestions } as unknown as Json
            })
        ]);
      } catch (publicFormError) {
        debugError("Error saving to public form and legacy location:", publicFormError);
        // Continue even if this fails
      }

      debugLog("Successfully saved slider questions via direct insert:", data);
      return data?.id || "success";
    }
  } catch (error) {
    debugError("Failed to save slider questions:", error);
    throw error;
  }
};

export const getSliderQuestions = async (projectId: string, isTemplateProject: boolean = false): Promise<SliderQuestion[] | null> => {
  debugLog("SliderQuestionsService - Fetching slider questions for project:", projectId, "isTemplate:", isTemplateProject);

  try {
    // Define async helper for canonical location since it has template logic
    const fetchCanonical = async () => {
      const queryBuilder = supabase
        .from('activity_responses')
        .select('ar_response, created_at')
        .eq('ar_project_id', projectId)
        .eq('ar_phase_id', CANONICAL_SLIDER_LOCATION.phase)
        .eq('ar_step_id', CANONICAL_SLIDER_LOCATION.step)
        .eq('ar_activity_id', CANONICAL_SLIDER_LOCATION.activity)
        .order('created_at', { ascending: false })
        .limit(1);

      if (isTemplateProject) {
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('fetch_activity_response', {
            project_id: projectId,
            phase_id: CANONICAL_SLIDER_LOCATION.phase,
            step_id: CANONICAL_SLIDER_LOCATION.step,
            activity_id: CANONICAL_SLIDER_LOCATION.activity
          });

          if (!rpcError && rpcData) {
            if (typeof rpcData === 'object' && !Array.isArray(rpcData)) {
              const typedResponse = rpcData as unknown as FetchActivityResponseResult;
              if (typedResponse.found && typedResponse.data && typedResponse.data.ar_response) {
                return { data: { ar_response: typedResponse.data.ar_response }, error: null };
              }
            }
          }
        } catch (rpcError) {
          debugError("RPC fetch failed, falling back to direct query:", rpcError);
        }
      }
      return await queryBuilder.maybeSingle();
    };

    // Run all fallback queries in parallel
    const [canonicalResult, publicFormResult, designResult, legacyResult, directResult] = await Promise.all([
      // 1. Canonical location
      fetchCanonical(),

      // 2. Public form location
      supabase
        .from('activity_responses')
        .select('ar_response, created_at')
        .eq('ar_project_id', projectId)
        .eq('ar_phase_id', PUBLIC_FORM_SLIDER_LOCATION.phase)
        .eq('ar_step_id', PUBLIC_FORM_SLIDER_LOCATION.step)
        .eq('ar_activity_id', PUBLIC_FORM_SLIDER_LOCATION.activity)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // 3. Private design location
      supabase
        .from('activity_responses')
        .select('ar_response')
        .eq('ar_project_id', projectId)
        .eq('ar_phase_id', 'design')
        .eq('ar_step_id', 'slider-questions')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // 4. Legacy format
      supabase
        .from('activity_responses')
        .select('ar_response')
        .eq('ar_project_id', projectId)
        .eq('ar_phase_id', 'collection')
        .eq('ar_step_id', 'public-form')
        .eq('ar_activity_id', PUBLIC_ACTIVITY_IDS.LEGACY_FORM_CONFIG)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // 5. Direct format
      supabase
        .from('activity_responses')
        .select('ar_response')
        .eq('ar_project_id', projectId)
        .eq('ar_phase_id', 'collection')
        .eq('ar_activity_id', 'slider-questions')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    // Check results in precedence order
    if (!canonicalResult.error && canonicalResult.data?.ar_response) {
      debugLog("Found slider questions in canonical location");
      const questions = extractSliderQuestions(canonicalResult.data.ar_response);
      if (questions && questions.length > 0) {
        debugLog(`Found ${questions.length} slider questions in canonical location`);
        return questions;
      }
    }

    if (!publicFormResult.error && publicFormResult.data?.ar_response) {
      debugLog("Found slider questions in public form location");
      const questions = extractSliderQuestions(publicFormResult.data.ar_response);
      if (questions && questions.length > 0) {
        debugLog(`Found ${questions.length} slider questions in public form location`);
        return questions;
      }
    }

    if (!designResult.error && designResult.data?.ar_response) {
      debugLog("Found slider questions in design phase");
      const questions = extractSliderQuestions(designResult.data.ar_response);
      if (questions && questions.length > 0) {
        debugLog(`Found ${questions.length} slider questions in design phase`);
        return questions;
      }
    }

    if (!legacyResult.error && legacyResult.data?.ar_response) {
      debugLog("Found slider questions in legacy format");
      const questions = extractSliderQuestions(legacyResult.data.ar_response);
      if (questions && questions.length > 0) {
        debugLog(`Found ${questions.length} slider questions in legacy format`);
        return questions;
      }
    }

    if (!directResult.error && directResult.data?.ar_response) {
      debugLog("Found slider questions in direct format");
      const questions = extractSliderQuestions(directResult.data.ar_response);
      if (questions && questions.length > 0) {
        debugLog(`Found ${questions.length} slider questions in direct format`);
        return questions;
      }
    }

    debugLog("No slider questions found in any location");
    return null;
  } catch (error) {
    debugError("Failed to fetch slider questions:", error);
    return null;
  }
};
