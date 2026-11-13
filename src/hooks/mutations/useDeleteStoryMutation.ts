import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteStory } from '@/services/story/deleteStory';
import { storiesQueryKey } from '@/hooks/queries/useStoriesQuery';

export const useDeleteStoryMutation = (projectId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storyId: string | number) => deleteStory(storyId),
    onSuccess: () => {
      // Invalidate stories cache to refetch
      void queryClient.invalidateQueries({ queryKey: storiesQueryKey(projectId) });
    },
  });
};
