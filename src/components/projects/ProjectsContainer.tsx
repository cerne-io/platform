import { debugLog } from "@/utils/debugLogger";
import { Button } from "@/components/ui/button";

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Project } from "@/types/project";
import { useProjects } from "@/hooks/useProjects";
import ProjectFormDialog from "./ProjectFormDialog";
import ProjectsContent from "./ProjectsContent";
import CopyTemplateDialog from "./CopyTemplateDialog";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { projectsQueryKey } from "@/hooks/queries/useProjectsQuery";

const ProjectsContainer = () => {
  const { user } = useAuth();
  const isAdmin = Boolean(user);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    navigateToProject,
    copyFromTemplate,
    projectOwners,
    createTemplateProject,
  } = useProjects();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [templateToCopy, setTemplateToCopy] = useState<Project | null>(null);
  const [isTemplateDialog, setIsTemplateDialog] = useState(false);


  // Handle URL-based actions (Deep Linking for Tour)
  useEffect(() => {
    const action = searchParams.get('action');
    const projectId = searchParams.get('projectId');

    if (action === 'copy-template' && projectId && !loading && projects.length > 0) {
      const projectToCopy = projects.find(p => p.id === projectId);
      if (projectToCopy && projectToCopy.is_template) {
        debugLog("Deep link triggered: copy-template", projectToCopy.name);
        handleCopyTemplate(projectToCopy);
        // Optional: clear params after triggering to avoid loops/re-triggering on refresh
        // But for tour persistence, we might want to keep it until the action completes?
        // Let's keep it for now as the user might refresh.
        // We just need to make sure we don't re-open it if already open?
        // Actually, if isCopyDialogOpen is false, we open it.
      }
    }
  }, [searchParams, projects, loading]);

  const handleCreateProject = async (name: string, description: string) => {
    try {
      // Check if we're creating a template or regular project
      if (isTemplateDialog) {
        // Use the template project creation
        debugLog("Creating a template project");
        const newProject = await createTemplateProject(name, description);
        if (newProject) {
          setIsCreateDialogOpen(false);
          navigateToProject(newProject);
        }
      } else {
        // Use the standard project creation
        debugLog("Creating a regular project");
        const newProject = await createProject(name, description);
        if (newProject) {
          setIsCreateDialogOpen(false);
          navigateToProject(newProject);
        }
      }
    } catch (err) {
      debugLog("Error in handleCreateProject:", err);
    }
  };

  const handleEditProject = async (name: string, description: string) => {
    if (currentProject) {
      const success = await updateProject(currentProject.id, name, description);
      if (success) {
        setIsEditDialogOpen(false);
        setCurrentProject(null);
      }
    }
  };

  const openProjectForEditing = (project: Project) => {
    setCurrentProject(project);
    setIsEditDialogOpen(true);
  };

  const handleCopyTemplate = (template: Project) => {
    setTemplateToCopy(template);
    setIsCopyDialogOpen(true);
  };

  const handleConfirmCopy = async (newName: string) => {
    if (templateToCopy) {
      try {
        const newProject = await copyFromTemplate(templateToCopy.id, newName);
        if (newProject) {
          setIsCopyDialogOpen(false);
          setTemplateToCopy(null);
          // Clear query params purely for cleanup after successful action
          setSearchParams({});
          navigateToProject(newProject);
        }
      } catch (err) {
        debugLog("Error in handleConfirmCopy:", err);
      }
    }
  };

  const handleToggleArchive = async (project: Project) => {
    const nextArchived = !project.is_archived;
    const { error } = await supabase
      .from("projects")
      .update({
        is_archived: nextArchived,
        ...(nextArchived ? { is_active: false } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update project archive state",
        variant: "destructive",
      });
      return;
    }

    await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    toast({
      title: nextArchived ? "Project Archived" : "Project Unarchived",
      description: nextArchived
        ? `"${project.name}" has been archived and its active slot is now free.`
        : `"${project.name}" has been restored as a draft project.`,
    });
  };

  return (
    <>
      <div className="space-y-8">
        <div>
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
            <div className="w-full md:w-auto space-y-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground [text-wrap:balance]">
                Narrative Projects
              </h1>
              <p className="text-sm text-muted-foreground">The pulse and workspace of your narrative projects.</p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-6 border-b border-border/60 pb-3">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Active Projects
            </h2>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsTemplateDialog(true);
                  setIsCreateDialogOpen(true);
                }}
                className="text-xs text-primary font-medium hover:bg-accent/60"
              >
                + New Template
              </Button>
            )}
          </div>

          <ProjectsContent
            projects={projects}
            loading={loading}
            onCreateClick={() => {
              setIsTemplateDialog(false);
              setIsCreateDialogOpen(true);
            }}
            onOpenProject={navigateToProject}
            onEditProject={openProjectForEditing}
            onDeleteProject={(id) => void deleteProject(id)}
            onCopyTemplate={handleCopyTemplate}
            projectOwners={projectOwners}
            onToggleArchive={(project) => void handleToggleArchive(project)}
          />
        </div>
      </div>

      {/* Copy Template Dialog */}
      <CopyTemplateDialog
        open={isCopyDialogOpen}
        onOpenChange={(open) => {
          setIsCopyDialogOpen(open);
          // If closed manually AND we have search params, clear them
          if (!open && searchParams.get('action') === 'copy-template') {
            setSearchParams({});
          }
        }}
        templateName={templateToCopy?.name || ""}
        onConfirm={handleConfirmCopy}
      />

      {/* Create Project Dialog */}
      <ProjectFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={(name, description) => void handleCreateProject(name, description)}
        mode="create"
        isTemplate={isTemplateDialog}
      />

      {/* Edit Project Dialog */}
      <ProjectFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={(name, description) => void handleEditProject(name, description)}
        project={currentProject}
        mode="edit"
        isTemplate={currentProject?.is_template}
      />
    </>
  );
};

export default ProjectsContainer;
