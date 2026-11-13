import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { devLog, safeError } from "@/utils/productionLogger";
import { debugLog, debugError } from "@/utils/debugLogger";

export type CompletionPhase = Database["public"]["Enums"]["completion_phase"];
export type CompletionStep = Database["public"]["Enums"]["completion_step"];
export type CompletionActivity = Database["public"]["Enums"]["completion_activity"];

interface CompletionStateParams {
  projectId: string;
  phase: CompletionPhase;
  step: CompletionStep;
  activity: CompletionActivity;
}

/**
 * Check if an activity is completed (server-side validation)
 */
export const isActivityCompleted = async (
  params: CompletionStateParams
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_activity_completed', {
      p_project_id: params.projectId,
      p_phase: params.phase,
      p_step: params.step,
      p_activity: params.activity
    });

    if (error) {
      safeError('Error checking activity completion:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    safeError('Unexpected error checking activity completion:', error);
    return false;
  }
};

/**
 * Mark an activity as completed (server-side validation)
 */
export const markActivityCompleted = async (
  params: CompletionStateParams
): Promise<boolean> => {
  try {
    debugLog('Calling mark_activity_completed RPC with params:', params);
    debugLog('Marking activity as completed:', params);

    const { data, error } = await supabase.rpc('mark_activity_completed', {
      p_project_id: params.projectId,
      p_phase: params.phase,
      p_step: params.step,
      p_activity: params.activity
    });

    debugLog('mark_activity_completed RPC response:', { data, error });

    if (error) {
      debugError('RPC error:', error);
      safeError('Error marking activity as completed:', error);
      return false;
    }

    debugLog('Activity marked as completed, data:', data);
    debugLog('Activity marked as completed successfully');
    return data === true;
  } catch (error) {
    debugError('Unexpected error in markActivityCompleted:', error);
    safeError('Unexpected error marking activity as completed:', error);
    return false;
  }
};

/**
 * Get all completion states for a project
 */
export const getProjectCompletionStates = async (
  projectId: string
): Promise<unknown[]> => {
  try {
    const { data, error } = await supabase
      .from('project_completion_state')
      .select('id, project_id, phase, step, activity, is_completed, updated_at')
      .eq('project_id', projectId)
      .eq('is_completed', true);

    if (error) {
      safeError('Error fetching project completion states:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    safeError('Unexpected error fetching project completion states:', error);
    return [];
  }
};

/**
 * Clear all completion states for a project (useful for reset/template handling)
 */
export const clearProjectCompletionStates = async (
  projectId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('project_completion_state')
      .delete()
      .eq('project_id', projectId);

    if (error) {
      safeError('Error clearing project completion states:', error);
      return false;
    }

    devLog('Project completion states cleared successfully');
    return true;
  } catch (error) {
    safeError('Unexpected error clearing project completion states:', error);
    return false;
  }
};
