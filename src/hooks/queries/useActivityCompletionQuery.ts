import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { debugError } from "@/utils/debugLogger";

export const activityCompletionQueryKey = (projectId: string | undefined) =>
  ['activity-completion', projectId] as const;

interface CompletedActivity {
  ar_phase_id: string;
  ar_step_id: string;
  ar_activity_id: string;
  ar_response?: unknown;
}

export const isActivityDataNonEmpty = (activityId: string, data: unknown): boolean => {
  if (data === null || data === undefined) return false;
  if (typeof data === 'string') return data.trim().length > 0;
  if (Array.isArray(data)) return data.length > 0;
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (activityId === 'participant-questions' || activityId === 'slider-questions' || activityId === 'triangle-questions') {
      if (Array.isArray(obj.questions)) return obj.questions.length > 0;
      if (Array.isArray(obj.sliders)) return obj.sliders.length > 0;
      if (Array.isArray(obj.triangles)) return obj.triangles.length > 0;
    }
    if (activityId === 'story-questions' || activityId === 'story-question') {
      if (typeof obj.story_question === 'string') return obj.story_question.trim().length > 0;
      if (obj.story_question && typeof obj.story_question === 'object') {
        return Object.values(obj.story_question as Record<string, string>).some(
          v => typeof v === 'string' && v.trim().length > 0
        );
      }
    }
    return Object.keys(obj).length > 0;
  }
  return true;
};

/**
 * Lightweight hook to check which activities have responses
 * Fetches activity IDs and checks that responses are non-empty
 */
export const useActivityCompletionQuery = (projectId: string | undefined) => {
  return useQuery({
    queryKey: activityCompletionQueryKey(projectId),
    queryFn: async () => {
      if (!projectId) return new Set<string>();

      const { data, error } = await supabase
        .from('activity_responses')
        .select('ar_phase_id, ar_step_id, ar_activity_id, ar_response')
        .eq('ar_project_id', projectId);

      if (error) {
        debugError('[ActivityCompletion] Error fetching completion data:', error);
        return new Set<string>();
      }

      // Create a Set of completed activity IDs for fast lookup
      const completedSet = new Set<string>();
      data?.forEach((item: CompletedActivity) => {
        if (isActivityDataNonEmpty(item.ar_activity_id, item.ar_response)) {
          completedSet.add(item.ar_activity_id);
        }
      });

      return completedSet;
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
};
