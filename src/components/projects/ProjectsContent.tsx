
import React, { memo } from "react";
import { Project } from "@/types/project";
import ProjectList from "./ProjectList";
import EmptyProjectState from "./EmptyProjectState";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectsContentProps {
  projects: Project[];
  loading: boolean;
  projectOwners: Record<string, string>;
  onCreateClick: () => void;
  onOpenProject: (project: Project) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onCopyTemplate?: (project: Project) => void;
  onToggleArchive?: (project: Project) => void;
}

// Using memo to prevent unnecessary re-renders
const ProjectsContent: React.FC<ProjectsContentProps> = memo(({
  projects,
  loading,
  projectOwners,
  onCreateClick,
  onOpenProject,
  onEditProject,
  onDeleteProject,
  onCopyTemplate,
  onToggleArchive,
}) => {
  // Always show loading state on initial load
  if (loading && projects.length === 0) {
    return <ProjectsLoadingSkeleton />;
  }

  // Check if there are actually any projects to display
  if (!projects || projects.length === 0) {
    return <EmptyProjectState onCreateClick={onCreateClick} />;
  }

  return (
    <ProjectList
      projects={projects}
      onOpen={onOpenProject}
      onEdit={onEditProject}
      onDelete={onDeleteProject}
      onCopyTemplate={onCopyTemplate}
      projectOwners={projectOwners}
      onCreateClick={onCreateClick}
      onToggleArchive={onToggleArchive}
    />
  );
});

ProjectsContent.displayName = 'ProjectsContent';

const ProjectsLoadingSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="border border-border/80 bg-card rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="p-6 pb-3">
            <Skeleton className="h-6 w-3/4 mb-2 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
          </div>
          <div className="px-6 py-4 space-y-2">
            <Skeleton className="h-3.5 w-full rounded" />
            <Skeleton className="h-3.5 w-full rounded" />
            <Skeleton className="h-3.5 w-2/3 rounded" />
          </div>
          <div className="px-6 py-4 flex justify-between items-center border-t border-border/60 bg-muted/20">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectsContent;
