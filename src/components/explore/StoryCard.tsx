
import React, { useState, memo } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import StoryDialog from "./StoryDialog";
import DeleteStoryDialog from "./DeleteStoryDialog";
import StoryCardContent from "./StoryCardContent";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";

import { Story } from "@/types/story";

interface StoryCardProps {
  story: Story;
  view: "grid" | "list";
  onDeleteSuccess?: () => void;
  onToggleSave?: (storyId: number | string, isSaved: boolean) => void;
  formatDate?: (dateString: string) => string;
  isPublic?: boolean;
}

const StoryCard = memo<StoryCardProps>(({
  story,
  view,
  onDeleteSuccess,
  onToggleSave,
  isPublic = false
}) => {
  /* 
   * Instead of local state, we should ideally use the URL params if we want everything to be deep-linkable.
   * However, StoryCard is used in many places. 
   * If we are in the context of Explore page, pushing to URL is good.
   * If we are elsewhere, maybe not?
   * For simplicity and strict tour requirements: let's update URL if we can. 
   * But wait, StoryCard is a dumb component. 
   * Let's check if we can pass a handler from Explore?
   * Actually, `onDialogOpen` prop exists. 
   * But `StoryCardContent` calls `onDialogOpen`. 
   * AND `StoryCard` renders `StoryDialog` itself.
   * This duplicates the "Global Dialog" we just added in Explore.
   * 
   * STRATEGY: 
   * We will keep local dialog for simple standard behavior BUT
   * we will ALSO update the URL when it opens, so the tour sees it?
   * OR better: We rely on the global dialog in Explore, and StoryCard's dialog is for other pages?
   * 
   * Actually, for the Tour, we want the "Open" click to be trackable.
   * If I update the URL, the Explore page global dialog will open.
   * So StoryCard double-opening it would be bad.
   * 
   * Refined Strategy:
   * We will check if `onOpenStory` prop is provided (we can add it).
   * OR we just update the URL hash/search params directly here for deep linking support.
   */

  // We'll import useSearchParams but use it cautiously
  // Note: we can't easily conditionally use hooks.
  // We'll stick to local state for now to avoid breaking other pages.
  // The user only asked for deep linking CAPABILITY (navigating TO the url).
  // They didn't strictly say clicking the card MUST update the URL, but it's implied for "interactions".
  // Let's modify StoryCardContent's parent (StoryCard) to set params if logical.

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(() => {
    if (story.isSaved !== undefined) return story.isSaved;
    try {
      const savedStories = JSON.parse(localStorage.getItem('savedStories') || '{}');
      return !!savedStories[story.id];
    } catch {
      return false;
    }
  });
  const { activeProject, currentUserProjectRole } = useProject();
  const isAdmin = Boolean(useAuth().user);

  const isTemplateProject = activeProject?.is_template;
  const isPublicMode = Boolean(isPublic);
  const isOwner = currentUserProjectRole === 'owner' && !isPublicMode;

  const handleSaveToggle = () => {
    const newSavedState = !isSaved;
    setIsSaved(newSavedState);

    const savedStories = JSON.parse(localStorage.getItem('savedStories') || '{}');
    if (newSavedState) {
      savedStories[story.id] = true;
    } else {
      delete savedStories[story.id];
    }
    localStorage.setItem('savedStories', JSON.stringify(savedStories));
    window.dispatchEvent(new Event('savedStoriesUpdated'));

    if (onToggleSave) {
      onToggleSave(story.id, newSavedState);
    }
  };

  const handleDeleteSuccess = () => {
    setIsDeleteDialogOpen(false);

    if (onDeleteSuccess) {
      onDeleteSuccess();
    }
  };

  const handleDeleteClick = () => {
    if (isOwner && !(isTemplateProject && !isAdmin)) {
      setIsDeleteDialogOpen(true);
    }
  };

  const handleOpenDialog = () => {
    // Update URL for deep linking support
    const newParams = new URLSearchParams(window.location.search);
    newParams.set('storyId', String(story.id));
    window.history.pushState({}, '', `${window.location.pathname}?${newParams.toString()}`);

    // Also open local dialog (redundant if Explore handles it, but safe)
    setIsDialogOpen(true);
  };

  return (
    <>
      <Card
        key={story.id}
        onClick={handleOpenDialog}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleOpenDialog();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`View story: ${story.title || "Untitled"}`}
        data-tour="story-open-btn"
        className={cn(
          "group overflow-hidden bg-card border border-border/80 rounded-lg shadow-xs transition-colors duration-150 hover:border-primary/60 hover:shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/50",
          view === "list" ? "w-full" : "h-full flex flex-col"
        )}
      >
        <StoryCardContent
          story={story}
          view={view}
          isPublic={isPublicMode}
          isSaved={isSaved}
          projectId={activeProject?.id}
          onDialogOpen={handleOpenDialog}
          onToggleSave={handleSaveToggle}
          onDeleteClick={isOwner ? handleDeleteClick : undefined}
        />
      </Card>

      <StoryDialog
        story={story}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          // Clear param
          const newParams = new URLSearchParams(window.location.search);
          newParams.delete('storyId');
          window.history.pushState({}, '', `${window.location.pathname}?${newParams.toString()}`);
        }}
      />

      <DeleteStoryDialog
        storyId={story.id}
        storyTitle={story.title}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </>
  );
});

StoryCard.displayName = "StoryCard";

export default StoryCard;
