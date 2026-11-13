
import StoryCard from "./StoryCard";

import { Story } from "@/types/story";

interface StoryListProps {
  stories: Story[];
  view: "grid" | "list";
  getFeelingColor: (feeling: string) => string;
  formatDate: (dateString: string) => string;
  onStoryDelete: () => void;
  onToggleSave?: (storyId: number | string, isSaved: boolean) => void;
}

const StoryList = ({ stories, view, formatDate, onStoryDelete, onToggleSave }: StoryListProps) => {
  return (
    <div className={`grid gap-6 ${view === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
      {stories.map((story) => (
        <StoryCard
          key={story.id}
          story={story}
          view={view}
          formatDate={formatDate}
          onDeleteSuccess={onStoryDelete}
          onToggleSave={onToggleSave}
        />
      ))}
    </div>
  );
};

export default StoryList;
