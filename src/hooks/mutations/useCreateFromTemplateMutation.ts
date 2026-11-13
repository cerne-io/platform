import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Project } from '@/types/project';
import { projectsQueryKey } from '@/hooks/queries/useProjectsQuery';
import { debugError } from "@/utils/debugLogger";

interface CreateFromTemplateParams {
  templateId: string;
  newProjectName: string;
}

export const useCreateFromTemplateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<Project, Error, CreateFromTemplateParams>({
    mutationFn: async ({ templateId, newProjectName }) => {
      const { data, error } = await supabase.rpc('copy_template_to_user', {
        template_id: templateId,
        new_project_name: newProjectName,
      });

      if (error) throw error;

      // The RPC now returns TABLE(new_project_id UUID, story_mapping JSONB)
      // So data is an array of objects
      const result = Array.isArray(data) ? data[0] : data;
      const newProjectId = result?.new_project_id;

      if (!newProjectId) {
        throw new Error("Failed to create project: No project ID returned");
      }

      // Copy vectors if mapping exists
      // NOTE: Vector copying is now handled entirely automatically by Postgres triggers 
      // which enqueue upsert jobs for the new cloned stories into the outbox for the worker.
      // No frontend action is needed here!

      // Fetch the newly created project
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', newProjectId)
        .single();

      if (fetchError) throw fetchError;

      return project;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Template copied!",
        description: `${variables.newProjectName} has been created. Searches and exploration may take a moment while stories are indexed.`,
      });

      void queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    },
    onError: (error) => {
      debugError("Error copying template:", error);
      toast({
        title: "Error copying template",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
