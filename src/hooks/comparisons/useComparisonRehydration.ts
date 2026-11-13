import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Story } from '@/types/story';
import { TriangleComparisonContext } from '@/components/dashboard/triangle/TriangleSelectionTypes';
import { SavedComparisonRow } from './useSavedComparisons';

export const useComparisonRehydration = (
  comparisonId: string | null, 
  stories: Story[],
  preFetchedComparison?: SavedComparisonRow | null
) => {
  const { data: fetchedComparison, isLoading, error } = useQuery({
    queryKey: ['saved_comparison', comparisonId],
    queryFn: async () => {
      if (!comparisonId || preFetchedComparison) return null;
      const { data, error } = await supabase
        .from('saved_comparisons')
        .select('*')
        .eq('id', comparisonId)
        .single();
      
      if (error) throw error;
      return data as SavedComparisonRow;
    },
    enabled: !!comparisonId && !preFetchedComparison,
  });

  const comparison = preFetchedComparison || fetchedComparison;

  const rehydrated = useMemo(() => {
    if (!comparison || !stories.length) return null;

    // Filter to only IDs that exist in the currently loaded stories
    const availableStoryIds = new Set(stories.map(s => String(s.id)));
    
    const validGroupA = comparison.group_a_story_ids.filter(id => availableStoryIds.has(id));
    const validGroupB = comparison.group_b_story_ids.filter(id => availableStoryIds.has(id));
    
    // Find intersection (shared stories)
    const validShared = validGroupA.filter(id => validGroupB.includes(id));

    // Calculate drift
    const savedSnapshot = comparison.source_snapshot as Record<string, number> | null;
    let driftNotice = undefined;
    
    if (savedSnapshot) {
      const aDiff = savedSnapshot.groupACountAtSave - validGroupA.length;
      const bDiff = savedSnapshot.groupBCountAtSave - validGroupB.length;
      
      if (aDiff > 0 || bDiff > 0) {
        const totalLost = aDiff + bDiff;
        driftNotice = `${totalLost} ${totalLost === 1 ? 'story is' : 'stories are'} no longer available since this comparison was saved.`;
      }
    }

    if (validGroupA.length === 0 && validGroupB.length === 0) {
      return {
        isEmpty: true,
        driftNotice: "Both groups in this saved comparison are empty (stories were deleted or you don't have access).",
        context: null
      };
    }

    const context: TriangleComparisonContext = {
      source: comparison.analysis_type === 'triangle' ? 'triangle_selection' : 'slider_selection',
      questionId: comparison.primary_question_id,
      secondaryQuestionId: comparison.secondary_question_id || undefined,
      groups: [
        {
          id: "A",
          storyIds: validGroupA,
          createdAt: new Date().toISOString(),
          selectionMethod: "drag_selection",
          questionId: comparison.primary_question_id,
          selectionCount: validGroupA.length,
          triangleQuestionLabel: comparison.group_a_name,
        },
        {
          id: "B",
          storyIds: validGroupB,
          createdAt: new Date().toISOString(),
          selectionMethod: "drag_selection",
          questionId: comparison.primary_question_id,
          selectionCount: validGroupB.length,
          triangleQuestionLabel: comparison.group_b_name,
        }
      ],
      sharedStoryIds: validShared,
      savedComparisonId: comparison.id,
      savedComparisonTitle: comparison.name,
    };

    return {
      isEmpty: false,
      driftNotice,
      context,
      analysisType: comparison.analysis_type
    };

  }, [comparison, stories]);

  return {
    rehydrated,
    isLoading,
    error
  };
};
