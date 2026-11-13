
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { Project } from "@/types/project";
import { useProjectOwners } from "./projects/useProjectOwners";
import { toast } from "@/components/ui/use-toast";
import { useProjectsQuery } from "./queries/useProjectsQuery";
import { useTemplateProjectsQuery } from "./queries/useTemplateProjectsQuery";
import { useCreateProjectMutation } from "./mutations/useCreateProjectMutation";
import { useUpdateProjectMutation } from "./mutations/useUpdateProjectMutation";
import { useDeleteProjectMutation } from "./mutations/useDeleteProjectMutation";
import { useCreateFromTemplateMutation } from "./mutations/useCreateFromTemplateMutation";

export const useProjects = () => {
  const { setActiveProject } = useProject();
  const navigate = useNavigate();
  const isAdmin = Boolean(useAuth().user);

  // Query hooks
  const { data: userProjects = [], isLoading: userProjectsLoading } = useProjectsQuery();
  const { data: templateProjects = [], isLoading: templateProjectsLoading } = useTemplateProjectsQuery();

  // Mutation hooks
  const createProjectMutation = useCreateProjectMutation();
  const updateProjectMutation = useUpdateProjectMutation();
  const deleteProjectMutation = useDeleteProjectMutation();
  const createFromTemplateMutation = useCreateFromTemplateMutation();

  // Combine all projects
  const allProjects = useMemo(() => {
    return [...userProjects, ...templateProjects];
  }, [userProjects, templateProjects]);

  const loading = userProjectsLoading || templateProjectsLoading;

  const projectOwners = useProjectOwners(allProjects, isAdmin);

  // Navigation
  const navigateToProject = useCallback((project: Project) => {
    setActiveProject(project);
    navigate("/design");
  }, [navigate, setActiveProject]);

  // Create project
  const createProject = useCallback(async (name: string, description: string = "") => {
    try {
      const result = await createProjectMutation.mutateAsync({ name, description, isTemplate: false });
      return result;
    } catch {
      return null;
    }
  }, [createProjectMutation]);

  // Create template project (superadmins only)
  const createTemplateProject = useCallback(async (name: string, description: string = "") => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only superadmins can create template projects",
        variant: "destructive",
      });
      return null;
    }

    try {
      const result = await createProjectMutation.mutateAsync({ name, description, isTemplate: true });
      return result;
    } catch {
      return null;
    }
  }, [createProjectMutation, isAdmin]);

  // Copy from template
  const copyFromTemplate = useCallback(async (templateId: string, newName: string) => {
    try {
      const newProject = await createFromTemplateMutation.mutateAsync({
        templateId,
        newProjectName: newName,
      });
      return newProject;
    } catch {
      return null;
    }
  }, [createFromTemplateMutation]);

  // Update project with permission checks
  const updateProject = useCallback(async (projectId: string, name: string, description: string = "") => {
    const project = allProjects.find(p => p.id === projectId);

    if (!project) {
      toast({
        title: "Error",
        description: "Project not found",
        variant: "destructive",
      });
      return false;
    }

    // Check permissions for templates
    if (project.is_template && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You cannot modify template projects",
        variant: "destructive",
      });
      return false;
    }

    try {
      await updateProjectMutation.mutateAsync({
        projectId,
        name,
        description,
        isTemplate: project.is_template
      });
      return true;
    } catch {
      return false;
    }
  }, [allProjects, updateProjectMutation, isAdmin]);

  // Delete project with permission checks
  const deleteProject = useCallback(async (projectId: string) => {
    const project = allProjects.find(p => p.id === projectId);

    if (!project) {
      toast({
        title: "Error",
        description: "Project not found",
        variant: "destructive",
      });
      return false;
    }

    // Check permissions for templates
    if (project.is_template && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You cannot delete template projects",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await deleteProjectMutation.mutateAsync({ projectId });
      return result;
    } catch {
      return false;
    }
  }, [allProjects, deleteProjectMutation, isAdmin]);

  // Helper functions
  const canSaveChanges = useCallback((project: Project): boolean => {
    if (!project) return false;
    if (!project.is_template) return true;
    return isAdmin;
  }, [isAdmin]);

  return {
    projects: allProjects,
    loading,
    createProject,
    createTemplateProject,
    updateProject,
    deleteProject,
    navigateToProject,
    copyFromTemplate,
    projectOwners,
    canSaveChanges,
  };
};
