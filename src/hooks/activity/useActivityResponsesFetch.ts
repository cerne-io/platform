
import { useCallback } from "react";
import { useActivityResponsesCore } from "./useActivityResponsesCore";
import { fetchActivityResponse as fetchActivityResponseOperation } from "@/services/supabaseSync/operations";
import { debugLog, debugError } from "@/utils/debugLogger";

/**
 * Hook for fetching activity response data from Supabase
 */
export const useActivityResponsesFetch = (projectId: string) => {
  const {
    loading,
    setLoading,
    showErrorToast,
    logDebug,
    debugSupabaseQuery
  } = useActivityResponsesCore(projectId);

  /**
   * Fetch activity response data from Supabase
   */
  const fetchActivityResponse = useCallback(async <T>(
    phaseId: string,
    stepId: string,
    activityId: string,
    defaultValue: T = null as unknown as T,
    responseKey: string | null = null,
    forceRefresh: boolean = false
  ): Promise<T> => {
    if (!projectId) {
      logDebug(`No project ID provided for ${phaseId}/${stepId}/${activityId}`);
      return defaultValue;
    }

    logDebug(`Fetching activity data for ${activityId}`);
    debugSupabaseQuery(`Fetching from ${phaseId}/${stepId}/${activityId}`);

    setLoading(true);

    try {
      const response = await fetchActivityResponseOperation<T>(
        projectId,
        phaseId,
        stepId,
        activityId,
        defaultValue,
        responseKey,
        forceRefresh
      );

      // Log the actual response to help with debugging
      debugLog(`RESPONSE FOR ${activityId}:`, response);

      if (!response) {
        debugLog(`No data found for ${activityId}`);
      } else {
        logDebug(`[ActivityResponses] Fetched activity response: ${JSON.stringify(response).substring(0, 100)}...`);
      }

      return response;
    } catch (error) {
      debugError(`Error fetching activity response for ${activityId}:`, error);
      showErrorToast(
        "Error Loading Data",
        `There was a problem loading data for ${activityId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return defaultValue;
    } finally {
      setLoading(false);
    }
  }, [projectId, setLoading, showErrorToast, logDebug, debugSupabaseQuery]);

  return {
    fetchActivityResponse,
    loading
  };
};
