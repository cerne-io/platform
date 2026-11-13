import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from '@/components/ui/use-toast';

export type SavedComparisonRow = Database['public']['Tables']['saved_comparisons']['Row'];
export type SavedComparisonInsert = Database['public']['Tables']['saved_comparisons']['Insert'];
export type SavedComparisonUpdate = Database['public']['Tables']['saved_comparisons']['Update'];

export const savedComparisonsKeys = {
  all: ['saved_comparisons'] as const,
  byProject: (projectId: string) => [...savedComparisonsKeys.all, projectId] as const,
};

/**
 * Fetch all saved comparisons for a specific project.
 */
export const useSavedComparisonsQuery = (projectId: string | undefined) => {
  return useQuery({
    queryKey: savedComparisonsKeys.byProject(projectId!),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_comparisons')
        .select('*')
        .eq('project_id', projectId!)
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data as SavedComparisonRow[];
    },
  });
};

/**
 * Create a new saved comparison.
 */
export const useCreateSavedComparison = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comparison: SavedComparisonInsert) => {
      // Application level validation
      if (!comparison.group_a_story_ids || comparison.group_a_story_ids.length === 0) {
        throw new Error("Group A must contain at least one story.");
      }
      if (!comparison.group_b_story_ids || comparison.group_b_story_ids.length === 0) {
        throw new Error("Group B must contain at least one story.");
      }

      // Normalize IDs (deduplicate and sort)
      const normalizedA = Array.from(new Set(comparison.group_a_story_ids)).sort();
      const normalizedB = Array.from(new Set(comparison.group_b_story_ids)).sort();

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        throw new Error("You must be logged in to save comparisons.");
      }

      const { data, error } = await supabase
        .from('saved_comparisons')
        .insert([{
          ...comparison,
          created_by: userId,
          group_a_story_ids: normalizedA,
          group_b_story_ids: normalizedB,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: savedComparisonsKeys.byProject(data.project_id) });
      toast({
        title: "Comparison saved",
        description: "Your comparison has been successfully saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving comparison",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

/**
 * Update an existing saved comparison.
 */
export const useUpdateSavedComparison = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: SavedComparisonUpdate }) => {
      // If updating IDs, validate them
      if (updates.group_a_story_ids && updates.group_a_story_ids.length === 0) {
        throw new Error("Group A must contain at least one story.");
      }
      if (updates.group_b_story_ids && updates.group_b_story_ids.length === 0) {
        throw new Error("Group B must contain at least one story.");
      }

      const payload = { ...updates };

      if (updates.group_a_story_ids) {
        payload.group_a_story_ids = Array.from(new Set(updates.group_a_story_ids)).sort();
      }
      if (updates.group_b_story_ids) {
        payload.group_b_story_ids = Array.from(new Set(updates.group_b_story_ids)).sort();
      }

      const { data, error } = await supabase
        .from('saved_comparisons')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: savedComparisonsKeys.byProject(data.project_id) });
      toast({
        title: "Comparison updated",
        description: "Your comparison has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating comparison",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

/**
 * Delete a saved comparison.
 */
export const useDeleteSavedComparison = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('saved_comparisons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, projectId };
    },
    onSuccess: ({ projectId }) => {
      void queryClient.invalidateQueries({ queryKey: savedComparisonsKeys.byProject(projectId) });
      toast({
        title: "Comparison deleted",
        description: "The comparison has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting comparison",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
