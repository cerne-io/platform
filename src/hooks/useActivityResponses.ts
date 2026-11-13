import { useActivityResponsesSave } from "@/hooks/activity/useActivityResponsesSave";
import { debugLog, debugError } from "@/utils/debugLogger";

// Re-export TanStack Query hooks as the new recommended approach
export { useActivityResponseQuery } from '@/hooks/queries/useActivityResponseQuery';
export { useActivityResponseMutation } from '@/hooks/mutations/useActivityResponseMutation';

/**
 * Hook for fetching and saving activity responses
 * 
 * @deprecated Use useActivityResponseQuery and useActivityResponseMutation instead
 * This hook is maintained for backward compatibility
 */
export const useActivityResponses = (projectId: string) => {
  const { saveActivityResponse } = useActivityResponsesSave(projectId);

  /**
   * @deprecated Use useActivityResponseQuery instead
   */
  const fetchActivityResponse = async (
    phaseId: string,
    stepId: string,
    activityId: string,
    forceRefresh: boolean = false
  ) => {

    debugLog('[useActivityResponses] fetchActivityResponse is deprecated. Use useActivityResponseQuery instead.');

    const { fetchActivityResponse: fetchActivityResponseFromSupabase } = await import("@/services/supabaseSync/operations");

    if (!projectId) {
      debugError(`[ActivityResponses] Project ID is required to fetch activity data`);
      return null;
    }

    try {
      const response = await fetchActivityResponseFromSupabase(
        projectId,
        phaseId,
        stepId,
        activityId,
        null,
        null,
        forceRefresh
      );

      return response;
    } catch (error) {
      debugError(`Error fetching activity response for ${activityId}:`, error);
      return null;
    }
  };

  return {
    fetchActivityResponse,
    saveActivityResponse
  };
};
