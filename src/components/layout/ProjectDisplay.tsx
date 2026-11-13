


import { Project } from "@/types/project";
import { useProject } from "@/contexts/ProjectContext";
import { Folder } from "lucide-react";

interface ProjectDisplayProps {
  activeProject: Project | null;
  collapsed: boolean;
}

export const ProjectDisplay = ({ activeProject, collapsed }: ProjectDisplayProps) => {
  const { currentUserProjectRole } = useProject();
  
  // Don't render anything if sidebar is collapsed or no active project
  if (!activeProject || collapsed) {
    return null;
  }

  const isViewer = currentUserProjectRole === 'viewer';

  return (
    <div className="mx-2.5 my-2.5 p-2.5 rounded-xl bg-sidebar-accent/15 border border-sidebar-border/60 shadow-xs">
      <div className="flex items-center justify-between text-[11px] text-sidebar-foreground/75 font-medium">
        <span className="flex items-center gap-1.5">
          <Folder className="h-4 w-4 text-sky-400 shrink-0 inline" />
          Active Project
        </span>
        {isViewer && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300">
            View Only
          </span>
        )}
      </div>
      <div className="mt-1">
        <h3 className="font-semibold text-sm text-white truncate leading-snug tracking-tight" title={activeProject.name}>
          {activeProject.name}
        </h3>
      </div>
    </div>
  );
};
