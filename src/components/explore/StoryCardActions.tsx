import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Trash2, AudioWaveform } from "lucide-react";

interface StoryCardActionsProps {
  onDialogOpen?: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  onDeleteClick?: () => void;

  onTranscribe?: () => void;
  isTranscriptionPending?: boolean;
  isTranscribing?: boolean;
  view?: "grid" | "list";
}

const StoryCardActions = ({
  isSaved,
  onToggleSave,
  onDeleteClick,

  onTranscribe,
  isTranscriptionPending,
  isTranscribing,
}: StoryCardActionsProps) => {
  return (
    <div className="flex flex-col gap-2">
      {isTranscriptionPending && onTranscribe && (
        <Button
          className="w-full mb-2 active:scale-[0.98] transition-transform duration-150 shadow-xs text-xs"
          disabled={isTranscribing}
          onClick={(e) => {
            e.stopPropagation();
            onTranscribe();
          }}
          size="sm"
        >
          <AudioWaveform className="h-4 w-4 mr-1.5" />
          {isTranscribing ? "Transcribing..." : "Transcribe Now"}
        </Button>
      )}

      <div className="flex justify-end items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave();
          }}
          className="h-8 w-8 text-muted-foreground hover:text-foreground active:scale-95 transition-transform duration-150"
          aria-label={isSaved ? "Unsave story" : "Save story"}
          title={isSaved ? "Unsave story" : "Save story"}
        >
          {isSaved ? (
            <BookmarkCheck className="h-4 w-4 text-primary" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </Button>

        {onDeleteClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick();
            }}
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-transform duration-150"
            aria-label="Delete story"
            title="Delete story"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default StoryCardActions;
