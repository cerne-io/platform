import React from "react";
import type { LocalUser } from "@/lib/localClient";
import { Link } from "react-router-dom";
import { Project } from "@/types/project";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, BookOpen, MoreVertical, Archive } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  user: LocalUser | null;
  canEditProject: (project: Project) => boolean;
  canDeleteProject: (project: Project) => boolean;
  handleProjectHover: (projectId: string) => void;
  onEdit: (project: Project) => void;
  onOpen: (project: Project) => void;
  setProjectToDelete: (project: Project) => void;
  onToggleArchive?: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  user,
  canEditProject,
  canDeleteProject,
  handleProjectHover,
  onEdit,
  onOpen,
  setProjectToDelete,
  onToggleArchive,
}) => {
  const lifetimeStories = project.lifetime_stories_collected ?? project.stories_count ?? 0;

  const handleCardClick = () => {
    onOpen(project);
  };

  return (
    <Card
      key={project.id}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleCardClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open project: ${project.name}`}
      className={cn(
        "group overflow-hidden flex flex-col h-full relative cursor-pointer select-none rounded-lg shadow-none",
        "transition-colors duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:border-primary",
        project.is_active
          ? "bg-card border border-primary/70 hover:border-primary"
          : "bg-card border border-border/80 hover:border-foreground/30"
      )}
      onMouseEnter={() => handleProjectHover(project.id)}
    >
      <div className="absolute top-4 right-4 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Project actions"
              onClick={(e) => e.stopPropagation()}
              className="h-8 w-8 rounded-md bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-md border-border/80">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit(project);
              }}
              disabled={!canEditProject(project)}
              className="cursor-pointer"
            >
              <Edit size={14} className="mr-2" />
              Edit
            </DropdownMenuItem>
            {!project.is_template && (project.user_role === 'owner' || project.user_id === user?.id) && onToggleArchive && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleArchive(project);
                }}
                className="cursor-pointer"
              >
                <Archive size={14} className="mr-2" />
                {project.is_archived ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setProjectToDelete(project);
              }}
              disabled={!canDeleteProject(project)}
              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 size={14} className="mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardHeader className="pb-2.5 pr-12">
        <CardTitle className="text-lg sm:text-xl font-heading font-bold tracking-[-0.02em] text-foreground flex items-center gap-2 group-hover:text-primary transition-colors duration-150">
          {!project.is_template && (
            <div
              className="flex-shrink-0"
              title={project.has_active_link ? "Collection Link Active" : "No Active Link"}
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  project.has_active_link ? "bg-emerald-600" : "bg-muted-foreground/40"
                )}
              />
            </div>
          )}
          <span className="truncate">{project.name}</span>
        </CardTitle>
        {!project.is_template && (
          <CardDescription className="text-xs text-muted-foreground tabular-nums mt-0.5">
            Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between gap-4 pt-0">
        {project.description?.trim() ? (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {project.description}
          </p>
        ) : (
          <div />
        )}

        <div className="space-y-1.5 pt-1">
          {project.is_archived && (
            <Badge variant="outline" className="border-border bg-muted text-muted-foreground font-medium text-xs tabular-nums w-fit">
              Archived ({lifetimeStories} {lifetimeStories === 1 ? "Entry" : "Entries"})
            </Badge>
          )}

          {!project.is_archived && (
            <div className="space-y-1">
              <span className="text-xs font-medium tabular-nums text-foreground">
                {lifetimeStories} {lifetimeStories === 1 ? "Entry" : "Entries"}
              </span>
              {project.last_story_at && (
                <p className="text-xs text-muted-foreground tabular-nums truncate">
                  Last entry {formatDistanceToNow(new Date(project.last_story_at), { addSuffix: true })}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {project.is_template && (
        <CardFooter className="pt-2 mt-auto border-t-0 bg-transparent">
          <Link
            to={`?action=copy-template&projectId=${project.id}`}
            className="block w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full border-border bg-background text-foreground hover:bg-muted font-medium shadow-none transition-colors"
            >
              <BookOpen size={14} className="mr-2 text-muted-foreground" />
              Copy Template
            </Button>
          </Link>
        </CardFooter>
      )}
    </Card>
  );
};

export default ProjectCard;
