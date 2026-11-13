import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Project } from '@/types/project';
import { projectsQueryKey } from '@/hooks/queries/useProjectsQuery';
import { templateProjectsQueryKey } from '@/hooks/queries/useTemplateProjectsQuery';
import { debugError } from "@/utils/debugLogger";
import { useAuth } from '@/contexts/AuthContext';
import { getSignedOut } from '@/utils/auth/signedOutFlag';

interface CreateProjectParams {
  name: string;
  description?: string;
  isTemplate?: boolean;
}

/**
 * Mutation hook for creating projects (regular or template)
 */
export const useCreateProjectMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<Project | null, Error, CreateProjectParams>({
    mutationFn: async ({ name, description = '', isTemplate = false }) => {

      if (!user) {
        throw new Error('You must be logged in to create a project.');
      }

      const { data, error } = await supabase
        .from("projects")
        .insert({
          name,
          description,
          user_id: user.id,
          is_template: isTemplate,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      if (getSignedOut()) return;

      toast({
        title: `${variables.isTemplate ? 'Template project' : 'Project'} created`,
        description: `${variables.name} has been created successfully.`,
      });

      // Invalidate the appropriate query cache
      if (variables.isTemplate) {
        void queryClient.invalidateQueries({ queryKey: templateProjectsQueryKey });
      } else {
        void queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      }
    },
    onError: (error) => {
      debugError("Error creating project:", error);
      toast({
        title: "Error creating project",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
