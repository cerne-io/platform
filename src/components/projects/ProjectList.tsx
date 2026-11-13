import React, { useState } from "react";
import { Project } from "@/types/project";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { formAppearanceQueryKey, fetchFormAppearance } from "@/hooks/queries/useFormAppearanceQuery";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import ProjectCard from "./ProjectCard";

interface ProjectListProps {
  projects: Project[];
  onOpen: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onCopyTemplate?: (project: Project) => void;
  projectOwners?: Record<string, string>;
  onCreateClick?: () => void;
  onToggleArchive?: (project: Project) => Promise<void> | void;
}

const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  onOpen,
  onEdit,
  onDelete,
  onCreateClick,
  onToggleArchive,
}) => {
  const { user } = useAuth();
  const isAdmin = Boolean(user);
  const queryClient = useQueryClient();
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const sortedProjects = [...projects].sort((a, b) => {
    if (a.is_template && !b.is_template) return 1;
    if (!a.is_template && b.is_template) return -1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const handleProjectHover = (projectId: string) => {
    void queryClient.prefetchQuery({
      queryKey: formAppearanceQueryKey(projectId),
      queryFn: () => fetchFormAppearance(projectId),
    }).catch(() => {
      // Prefetch error is non-critical and can be ignored
    });
  };

  const canEditProject = (project: Project) => {
    if (project.is_template) return isAdmin;
    return project.user_id === user?.id || project.user_role === 'owner' || project.user_role === 'editor';
  };

  const canDeleteProject = (project: Project) => {
    if (project.is_template) return isAdmin;
    return project.user_id === user?.id || project.user_role === 'owner';
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          role="button"
          tabIndex={0}
          onClick={onCreateClick}
          onKeyDown={(e) => {
            if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onCreateClick?.();
            }
          }}
          className="group cursor-pointer select-none border border-dashed border-border/80 hover:border-foreground/30 bg-card/40 hover:bg-muted/20 rounded-lg flex flex-col items-center justify-center p-6 h-full min-h-[220px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:border-primary"
        >
          <div className="h-9 w-9 rounded-md border border-border/80 bg-background flex items-center justify-center mb-3 transition-colors group-hover:border-foreground/30">
            <Plus className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <h3 className="text-lg sm:text-xl font-heading font-semibold tracking-[-0.02em] text-foreground group-hover:text-primary transition-colors">
            New Project
          </h3>
          <p className="text-xs text-muted-foreground mt-1 text-center">Start a new narrative instrument</p>
        </div>

        {sortedProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            user={user}
            canEditProject={canEditProject}
            canDeleteProject={canDeleteProject}
            handleProjectHover={handleProjectHover}
            onEdit={onEdit}
            onOpen={onOpen}
            setProjectToDelete={setProjectToDelete}
            onToggleArchive={onToggleArchive ? (p) => void onToggleArchive(p) : undefined}
          />
        ))}
      </div>

      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent className="rounded-lg border border-border/80">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-foreground">Delete Project</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/80 shadow-none">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (projectToDelete) {
                  onDelete(projectToDelete.id);
                  setProjectToDelete(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProjectList;
