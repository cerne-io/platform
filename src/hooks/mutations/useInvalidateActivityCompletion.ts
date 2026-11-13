import { useQueryClient } from '@tanstack/react-query';
import { activityCompletionQueryKey } from '@/hooks/queries/useActivityCompletionQuery';

/**
 * Hook to invalidate activity completion cache after mutations
 */
export const useInvalidateActivityCompletion = () => {
  const queryClient = useQueryClient();

  return (projectId: string | undefined) => {
    void queryClient.invalidateQueries({ 
      queryKey: activityCompletionQueryKey(projectId) 
    });
  };
};
