import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { safeDeleteProject } from '@/utils/project/deletion';
import { projectsQueryKey } from '@/hooks/queries/useProjectsQuery';
import { templateProjectsQueryKey } from '@/hooks/queries/useTemplateProjectsQuery';
import { projectKeys } from '@/hooks/queries/projectKeys';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Project } from '@/types/project';
import { debugError } from "@/utils/debugLogger";

interface DeleteProjectParams {
  projectId: string;
}

interface DeleteProjectContext {
  prevUserProjects: Project[];
  prevTemplates: Project[];
}

/**
 * Mutation hook for deleting projects with optimistic updates
 */
export const useDeleteProjectMutation = () => {
  const queryClient = useQueryClient();
  const { activeProject, setActiveProject } = useProject();
  const { user } = useAuth();

  return useMutation<boolean, Error, DeleteProjectParams, DeleteProjectContext>({
    mutationFn: async ({ projectId }) => {
      const success = await safeDeleteProject(projectId);

      if (!success) {
        throw new Error('Failed to delete project');
      }

      return success;
    },
    onMutate: async ({ projectId }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: projectsQueryKey });
      await queryClient.cancelQueries({ queryKey: templateProjectsQueryKey });

      // Snapshot current data for rollback
      const prevUserProjects = queryClient.getQueryData<Project[]>(projectsQueryKey) || [];
      const prevTemplates = queryClient.getQueryData<Project[]>(templateProjectsQueryKey) || [];

      // Optimistically remove project from both caches
      queryClient.setQueryData<Project[]>(
        projectsQueryKey,
        (old) => old?.filter((p) => p.id !== projectId) || []
      );
      queryClient.setQueryData<Project[]>(
        templateProjectsQueryKey,
        (old) => old?.filter((p) => p.id !== projectId) || []
      );

      return { prevUserProjects, prevTemplates };
    },
    onSuccess: (_, variables) => {
      // If the deleted project is the currently active one, clear the selection
      if (activeProject?.id === variables.projectId) {
        setActiveProject(null);
      }
      
      // Remove detail cache immediately
      queryClient.removeQueries({ 
        queryKey: projectKeys.detail(user?.id ?? null, variables.projectId) 
      });

      toast({
        title: "Project deleted",
        description: "The project has been deleted successfully.",
      });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update on error
      if (context) {
        queryClient.setQueryData(projectsQueryKey, context.prevUserProjects);
        queryClient.setQueryData(templateProjectsQueryKey, context.prevTemplates);
      }

      debugError("Error deleting project:", error);
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency with server
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      void queryClient.invalidateQueries({ queryKey: templateProjectsQueryKey });
    },
  });
};
