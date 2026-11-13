import { useQuery } from '@tanstack/react-query';
import { fetchActivityResponse as fetchActivityResponseOperation } from '@/services/supabaseSync/operations';

/**
 * Generate query key for activity responses
 */
export const activityResponseQueryKey = (
  projectId: string | undefined,
  phaseId: string,
  stepId: string,
  activityId: string,
  responseKey?: string | null
) => {
  const key = ['activity-response', projectId, phaseId, stepId, activityId] as const;
  return responseKey ? [...key, responseKey] : key;
};

/**
 * Options for useActivityResponseQuery
 */
export interface UseActivityResponseQueryOptions<T> {
  defaultValue?: T;
  responseKey?: string | null;
  forceRefresh?: boolean;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * TanStack Query hook for fetching activity responses
 * 
 * @param projectId - The project ID
 * @param phaseId - The phase ID
 * @param stepId - The step ID
 * @param activityId - The activity ID
 * @param options - Query options
 */
export const useActivityResponseQuery = <T = unknown>(
  projectId: string | undefined,
  phaseId: string,
  stepId: string,
  activityId: string,
  options?: UseActivityResponseQueryOptions<T>
) => {
  const {
    defaultValue = null as T,
    responseKey = null,
    forceRefresh = false,
    enabled = true,
    staleTime = 1000 * 60 * 10, // 10 minutes
    gcTime = 1000 * 60 * 30, // 30 minutes
  } = options || {};

  return useQuery({
    queryKey: activityResponseQueryKey(projectId, phaseId, stepId, activityId, responseKey),
    queryFn: async () => {
      if (!projectId) {
        return defaultValue;
      }

      const response = await fetchActivityResponseOperation<T>(
        projectId,
        phaseId,
        stepId,
        activityId,
        defaultValue,
        responseKey,
        forceRefresh
      );

      return response ?? defaultValue;
    },
    enabled: !!projectId && enabled,
    staleTime,
    gcTime,
    refetchOnWindowFocus: false,
  });
};
