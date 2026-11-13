
import { supabase } from "@/integrations/supabase/client";
import { ParticipantQuestion, ParticipantQuestionsData } from "../types/designTypes";
import { PUBLIC_ACTIVITY_IDS } from "./constants";
import { Json } from "@/integrations/supabase/types";
import { extractParticipantQuestions, extractIncludePreferNotToSay } from "./utils";
import { debugLog, debugError } from "@/utils/debugLogger";

export const saveParticipantQuestions = async (projectId: string, participantQuestions: ParticipantQuestion[], includePreferNotToSay: boolean = true): Promise<string> => {
  debugLog("Saving public participant questions for project:", projectId, participantQuestions, includePreferNotToSay);
  try {
    // Clean and format participant questions
    const formattedParticipantQuestions = participantQuestions.map(q => {
      const qType = q.questionType || (q as unknown as { type?: string }).type;
      return {
        id: q.id,
        label: typeof q.label === 'string' ? q.label.trim() : "",
        questionType: qType === 'checkboxes' ? 'checkboxes' : 'multiple-choice',
        includePreferNotToSay: q.includePreferNotToSay !== undefined ? !!q.includePreferNotToSay : undefined,
        checked: q.checked !== undefined ? !!q.checked : false,
        translations: q.translations || {},
        choices: Array.isArray(q.choices)
          ? q.choices.map(c => ({
            id: c.id,
            label: typeof c.label === 'string' ? c.label.trim() : "",
            translations: c.translations || {}
          }))
          : []
      };
    });

    // Try to use the RPC function to bypass RLS
    try {
      debugLog("Using RPC function to save participant questions");
      const { data: rpcData, error: rpcError } = await supabase.rpc('insert_activity_response', {
        project_id: projectId,
        phase_id: 'collection',
        step_id: 'public-form',
        activity_id: PUBLIC_ACTIVITY_IDS.PARTICIPANT_QUESTIONS,
        response_data: { participantQuestions: formattedParticipantQuestions, includePreferNotToSay } as unknown as Json
      });

      if (rpcError) {
        debugError("Error saving participant questions via RPC:", rpcError);
        throw rpcError;
      }

      debugLog("Successfully saved participant questions via RPC:", rpcData);
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
          ar_phase_id: 'collection',
          ar_step_id: 'public-form',
          ar_activity_id: PUBLIC_ACTIVITY_IDS.PARTICIPANT_QUESTIONS,
          ar_response: { participantQuestions: formattedParticipantQuestions, includePreferNotToSay } as unknown as Json
        })
        .select('id')
        .maybeSingle();

      if (insertError) {
        debugError("Error saving participant questions via direct insert:", insertError);
        throw insertError;
      }

      debugLog("Successfully saved participant questions via direct insert:", data);
      return data?.id || "success";
    }
  } catch (error) {
    debugError("Failed to save public participant questions:", error);
    throw error;
  }
};

export const getParticipantQuestions = async (projectId: string): Promise<ParticipantQuestionsData | null> => {
  debugLog("Fetching public participant questions for project:", projectId);
  try {
    // Run all fallback queries in parallel
    const [publicFormResult, designResult, legacyResult] = await Promise.all([
      // First try the collection/public-form path
      supabase
        .from('activity_responses')
        .select('ar_response')
        .eq('ar_project_id', projectId)
        .eq('ar_phase_id', 'collection')
        .eq('ar_step_id', 'public-form')
        .eq('ar_activity_id', PUBLIC_ACTIVITY_IDS.PARTICIPANT_QUESTIONS)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // If not found, try the design phase location
      supabase
        .from('activity_responses')
        .select('ar_response')
        .eq('ar_project_id', projectId)
        .eq('ar_phase_id', 'design')
        .eq('ar_step_id', 'participant-questions')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Also try to fetch from legacy format if still not found
      supabase
        .from('activity_responses')
        .select('ar_response')
        .eq('ar_project_id', projectId)
        .eq('ar_phase_id', 'collection')
        .eq('ar_activity_id', 'participant-questions')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    // Check results in precedence order
    if (!publicFormResult.error && publicFormResult.data?.ar_response) {
      debugLog("Found public participant questions in collection/public-form");
      const questions = extractParticipantQuestions(publicFormResult.data.ar_response);
      const includePreferNotToSay = extractIncludePreferNotToSay(publicFormResult.data.ar_response);
      if (Array.isArray(questions)) {
        debugLog(`Found ${questions.length} participant questions`);
        return { questions, includePreferNotToSay };
      }
    }

    if (!designResult.error && designResult.data?.ar_response) {
      debugLog("Found participant questions in design phase");
      const questions = extractParticipantQuestions(designResult.data.ar_response);
      const includePreferNotToSay = extractIncludePreferNotToSay(designResult.data.ar_response);
      if (Array.isArray(questions)) {
        debugLog(`Found ${questions.length} participant questions in design phase`);
        return { questions, includePreferNotToSay };
      }
    }

    if (!legacyResult.error && legacyResult.data?.ar_response) {
      debugLog("Found participant questions in legacy format");
      const questions = extractParticipantQuestions(legacyResult.data.ar_response);
      const includePreferNotToSay = extractIncludePreferNotToSay(legacyResult.data.ar_response);
      if (Array.isArray(questions)) {
        debugLog(`Found ${questions.length} participant questions in legacy format`);
        return { questions, includePreferNotToSay };
      }
    }

    debugLog("No public participant questions found");
    return null;
  } catch (error) {
    debugError("Failed to fetch public participant questions:", error);
    return null;
  }
};
