
import React, { memo } from "react";
import { Loader2 } from "lucide-react";
import EmptyStoriesState from "./EmptyStoriesState";
import StoryList from "./StoryList";
import StoriesPagination from "./StoriesPagination";
import { Story } from "@/types/story";

interface StoriesContentProps {
  isLoading: boolean;
  filteredStories: Story[];
  paginatedStories: Story[];
  allStoriesEmpty: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  view: "grid" | "list";
  projectName?: string;
  getFeelingColor: (feeling: string) => string;
  formatDate: (dateString: string) => string;
  onStoryDelete: () => void;
  onToggleSave?: (storyId: number | string, isSaved: boolean) => void;
}

const StoriesContent = memo<StoriesContentProps>(({
  isLoading,
  filteredStories,
  paginatedStories,
  allStoriesEmpty,
  currentPage,
  totalPages,
  onPageChange,
  view,
  projectName,
  getFeelingColor,
  formatDate,
  onStoryDelete,
  onToggleSave
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-primary">Loading stories...</span>
      </div>
    );
  }

  if (filteredStories.length === 0) {
    return (
      <EmptyStoriesState 
        allStoriesEmpty={allStoriesEmpty} 
        projectName={projectName}
      />
    );
  }

  return (
    <>
      <StoryList 
        stories={paginatedStories} 
        view={view}
        getFeelingColor={getFeelingColor}
        formatDate={formatDate}
        onStoryDelete={onStoryDelete}
        onToggleSave={onToggleSave}
      />
      
      {totalPages > 1 && (
        <div className="mt-8">
          <StoriesPagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </>
  );
});

StoriesContent.displayName = "StoriesContent";

export default StoriesContent;
