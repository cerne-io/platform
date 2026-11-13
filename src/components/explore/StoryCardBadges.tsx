
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Headphones } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoryCardBadgesProps {
  feeling: string;
  feelingSentiment?: "positive" | "neutral" | "negative";
  isPublic?: boolean;
  isImported?: boolean;
  isTranscribed?: boolean;
}

const StoryCardBadges = ({
  feeling,
  feelingSentiment,
  isPublic,
  isImported,
  isTranscribed,
}: StoryCardBadgesProps) => {
  const sentimentColor =
    feelingSentiment === "positive"
      ? "border-emerald-500/25 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
      : feelingSentiment === "neutral"
        ? "border-primary/25 text-primary bg-primary/10"
        : feelingSentiment === "negative"
          ? "border-rose-500/25 text-rose-700 dark:text-rose-400 bg-rose-500/10"
          : "border-border/80 text-muted-foreground bg-muted/40";

  return (
  <div className="flex flex-shrink-0 gap-1.5 items-center">
    {isTranscribed && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="border-sky-500/25 text-sky-700 dark:text-sky-400 bg-sky-500/10 flex items-center gap-1 shadow-none font-mono text-[11px] px-2 py-0.5 rounded-sm tracking-wide">
              <Headphones className="h-3 w-3" />
              <span className="hidden sm:inline">Audio</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This story was recorded as audio and transcribed</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}

    {isImported && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="border-amber-500/25 text-amber-700 dark:text-amber-400 bg-amber-500/10 shadow-none font-mono text-[11px] px-2 py-0.5 rounded-sm tracking-wide">
              Imported
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This story was imported from another source</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}

    {isPublic && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-muted-foreground border-border/80 bg-muted/40 shadow-none font-mono text-[11px] px-2 py-0.5 rounded-sm tracking-wide">
              Public
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This story was submitted through a public form</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}

    <Badge
      variant="outline"
      className={cn(
        "shadow-none font-mono text-[11px] px-2 py-0.5 rounded-sm capitalize tracking-wide",
        sentimentColor
      )}
    >
      {feeling.startsWith("other | ") ? feeling.replace("other | ", "") : feeling}
    </Badge>
  </div>
  );
};

export default StoryCardBadges;
