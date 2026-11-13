
import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface QuestionSelectorCardProps {
  questionText: string;
  average: number;
  responsesCount: number;
  leftLabel?: string;
  rightLabel?: string;
  isSelected: boolean;
  onClick: () => void;
  isDemo?: boolean; // Add isDemo prop
}

const QuestionSelectorCard: React.FC<QuestionSelectorCardProps> = ({
  questionText,
  average,
  responsesCount,
  leftLabel = "Low",
  rightLabel = "High",
  isSelected,
  onClick,
  isDemo = false // Default to false
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "p-4 rounded-xl transition-all duration-200 cursor-pointer border relative select-none",
        "hover:shadow-xs active:scale-[0.99]",
        isSelected
          ? "border-primary/60 bg-primary/5 shadow-xs ring-1 ring-primary/25"
          : "border-border/70 bg-card hover:bg-muted/40 hover:border-border"
      )}
      onClick={onClick}
    >
      {isDemo && (
        <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-amber-500 rounded-full"
          title="Demo Question" />
      )}
      <div className="text-xs sm:text-sm font-medium mb-2 line-clamp-2 h-10 text-foreground" title={questionText}>
        {questionText}
      </div>
      <div className="flex justify-between items-center mb-1">
        <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{average.toFixed(1)}</div>
        <Badge variant="secondary" className="bg-muted/80 text-muted-foreground text-xs font-normal tabular-nums">
          {responsesCount} {responsesCount === 1 ? 'response' : 'responses'}
        </Badge>
      </div>
      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
        <span className="truncate max-w-[45%]">{leftLabel}</span>
        <span className="truncate max-w-[45%] text-right">{rightLabel}</span>
      </div>
    </div>
  );
};

export default QuestionSelectorCard;
