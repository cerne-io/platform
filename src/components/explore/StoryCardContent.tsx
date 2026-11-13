import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StoryCardBadges from "./StoryCardBadges";
import StoryCardActions from "./StoryCardActions";
import { cleanStoryText, formatMonthDay } from "@/utils/story/formattingUtils";
import { isPreferNotToSayValue } from "@/utils/formDefaultTranslations";
import { Story } from "@/types/story";

export interface StoryCardContentProps {
  story: Story;
  view: "grid" | "list";
  isPublic?: boolean;
  isSaved?: boolean;
  projectId?: string;
  formatDate?: (date: string) => string;
  onDialogOpen: () => void;
  onToggleSave: () => void;
  onDeleteClick?: () => void;
}

const StoryCardContent = ({
  story,
  view,
  isPublic = false,
  isSaved = false,
  formatDate = formatMonthDay,
  onDialogOpen,
  onToggleSave,
  onDeleteClick,
}: StoryCardContentProps) => {
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const cleanedText = cleanStoryText(story.text, story.title, story.additional_comments);
  const displayText = view === "list" ? truncateText(cleanedText, 250) : truncateText(cleanedText, 120);
  const displayTitle = truncateText(story.title, 50);
  const isTranscribed = !isPublic && Boolean(story.has_audio);
  const displayName = !isPublic ? story.name : undefined;

  // Extract up to 3 non-empty contributor responses for quick context tags
  const contributorTags = (story.participantResponses || [])
    .flatMap((pr) => {
      if (!pr.response) return [];
      if (Array.isArray(pr.response)) return pr.response.map(String);
      return [String(pr.response)];
    })
    .filter((txt) => txt.trim() !== "" && !isPreferNotToSayValue(txt))
    .slice(0, 3);

  // Compact list view
  if (view === "list") {
    return (
      <div className="p-4 flex items-center gap-4 w-full">
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="font-heading font-semibold text-base text-foreground group-hover:text-primary transition-colors truncate mb-1 [text-wrap:balance]">{displayTitle}</h3>
          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed [text-wrap:pretty]">{displayText}</p>
          {contributorTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {contributorTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-mono tabular-nums bg-muted/40 text-muted-foreground border border-border/70 truncate max-w-[140px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StoryCardBadges
            feeling={story.feeling}
            feelingSentiment={story.feelingSentiment}
            isPublic={isPublic}
            isImported={false}
            isTranscribed={isTranscribed}
          />
          <StoryCardActions
            onDialogOpen={onDialogOpen}
            isSaved={!!isSaved}
            onToggleSave={onToggleSave}
            onDeleteClick={onDeleteClick}
            view={view}
          />
        </div>
      </div>
    );
  }

  // Grid view (original layout)
  return (
    <>
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="font-heading font-semibold text-base text-foreground group-hover:text-primary transition-colors leading-snug mr-1 [text-wrap:balance] line-clamp-2">{displayTitle}</CardTitle>
          <StoryCardBadges
            feeling={story.feeling}
            feelingSentiment={story.feelingSentiment}
            isPublic={isPublic}
            isImported={story.isImported}
            isTranscribed={isTranscribed}
          />
        </div>
        <div className="flex justify-between items-center text-xs mt-1.5 text-muted-foreground">
          <span className="tabular-nums font-mono">{formatDate(story.date)}</span>
          {displayName && <span className="font-medium text-foreground/70">{displayName}</span>}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 flex-1 flex flex-col">
        <p className="text-xs md:text-sm line-clamp-4 text-foreground/80 leading-relaxed mb-4 [text-wrap:pretty]">{displayText}</p>
        {contributorTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {contributorTags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-mono tabular-nums bg-muted/40 text-muted-foreground border border-border/70 truncate max-w-[140px]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto pt-2">
          <StoryCardActions
            onDialogOpen={onDialogOpen}
            isSaved={!!isSaved}
            onToggleSave={onToggleSave}
            onDeleteClick={onDeleteClick}
          />
        </div>
      </CardContent>
    </>
  );
};

export default StoryCardContent;
