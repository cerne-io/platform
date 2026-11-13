import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { projectsQueryKey } from '@/hooks/queries/useProjectsQuery';
import { templateProjectsQueryKey } from '@/hooks/queries/useTemplateProjectsQuery';
import { projectKeys } from '@/hooks/queries/projectKeys';
import { useAuth } from '@/contexts/AuthContext';
import { debugError } from "@/utils/debugLogger";

interface UpdateProjectParams {
  projectId: string;
  name: string;
  description?: string;
  isTemplate?: boolean;
}

/**
 * Mutation hook for updating projects with optimistic updates
 */
export const useUpdateProjectMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<void, Error, UpdateProjectParams>({
    mutationFn: async ({ projectId, name, description = '' }) => {
      const { error } = await supabase
        .from("projects")
        .update({
          name,
          description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      if (error) {
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Project updated",
        description: `${variables.name} has been updated successfully.`,
      });

      // Invalidate caches
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      void queryClient.invalidateQueries({ queryKey: templateProjectsQueryKey });
      void queryClient.invalidateQueries({ 
        queryKey: projectKeys.detail(user?.id ?? null, variables.projectId) 
      });
    },
    onError: (error) => {
      debugError("Error updating project:", error);
      toast({
        title: "Error updating project",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
