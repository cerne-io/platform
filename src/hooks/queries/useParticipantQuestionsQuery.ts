import { useQuery } from '@tanstack/react-query';
import { getParticipantQuestionsWithSync } from '@/services/sync/participantQuestionsSyncService';
import { ParticipantQuestionsData } from '@/services/types/designTypes';

export const participantQuestionsQueryKey = (projectId: string | undefined) =>
  ['participantQuestions', projectId] as const;

export const useParticipantQuestionsQuery = (projectId: string | undefined, enabled: boolean = true) => {
  return useQuery<ParticipantQuestionsData, Error>({
    queryKey: participantQuestionsQueryKey(projectId),
    queryFn: () => getParticipantQuestionsWithSync(projectId),
    enabled: enabled && !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};
