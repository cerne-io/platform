import { useQuery } from '@tanstack/react-query';
import { getSliderQuestionsWithSync } from '@/services/sync/sliderQuestionsSyncService';
import { SliderQuestion } from '@/services/types/designTypes';
import { checkIfTemplateProject } from '@/services/supabaseSync/operations/core/projectUtils';

export const sliderQuestionsQueryKey = (
  projectId: string | undefined,
  isTemplateProject: boolean
) => ['sliderQuestions', projectId, { isTemplate: isTemplateProject }] as const;

interface UseSliderQuestionsQueryProps {
  projectId?: string;
  isTemplateProject?: boolean;
  enabled?: boolean; // Allow consumers to control when query runs
}

export const useSliderQuestionsQuery = ({
  projectId,
  isTemplateProject: incomingIsTemplateProject,
  enabled = true
}: UseSliderQuestionsQueryProps) => {
  // Determine template status if not provided
  const { data: isTemplateStatus = false } = useQuery({
    queryKey: ['projectTemplateStatus', projectId],
    queryFn: () => checkIfTemplateProject(projectId!),
    enabled: enabled && !!projectId && incomingIsTemplateProject === undefined,
    staleTime: Infinity, // Template status doesn't change
  });

  const finalIsTemplate = incomingIsTemplateProject ?? isTemplateStatus;

  return useQuery<SliderQuestion[], Error>({
    queryKey: sliderQuestionsQueryKey(projectId, finalIsTemplate),
    queryFn: () => getSliderQuestionsWithSync(projectId, finalIsTemplate),
    enabled: enabled && !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};
