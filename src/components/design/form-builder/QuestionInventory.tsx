import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  AlignLeft,
  Smile,
  SlidersHorizontal,
  Triangle,
  Users,
  CircleDot,
  CheckSquare,
  ChevronDown,
  LucideIcon,
} from "lucide-react";
import { CERNE_QUESTION_TYPES, QuestionTypeInfo } from "./types";

const QUESTION_ICONS: Record<QuestionTypeInfo["icon"], LucideIcon> = {
  AlignLeft,
  Smile,
  SlidersHorizontal,
  Triangle,
  Users,
  CircleDot,
  CheckSquare,
};

interface QuestionInventoryProps {
  className?: string;
  onSelectType?: (type: string) => void;
}

export const QuestionInventory: React.FC<QuestionInventoryProps> = ({
  className,
  onSelectType,
}) => {
  const [isAdditionalElementsOpen, setIsAdditionalElementsOpen] = useState(false);

  const handleAddQuestion = (typeId: string) => {
    if (onSelectType) {
      onSelectType(typeId);
    }
    window.dispatchEvent(
      new CustomEvent("cerne:add-builder-question", {
        detail: { type: typeId },
      })
    );
  };

  const renderQuestionButton = (q: QuestionTypeInfo) => {
    const Icon = QUESTION_ICONS[q.icon] || AlignLeft;
    return (
      <button
        key={q.id}
        type="button"
        draggable
        onDragStart={(e: React.DragEvent<HTMLButtonElement>) => {
          e.dataTransfer.setData("text/cerne-question-type", q.id);
        }}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          handleAddQuestion(q.id);
        }}
        className="w-full group flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border/70 bg-card hover:bg-muted/40 hover:border-primary/40 shadow-xs hover:shadow-sm transition-all duration-200 ease-smooth cursor-pointer active:scale-[0.98] active:cursor-grabbing select-none text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        title="Click or drag to add to form"
      >
        <div className="h-6 w-6 rounded-md bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center shrink-0 transition-colors duration-200">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-medium text-foreground/90 group-hover:text-foreground truncate">
          {q.label}
        </span>
      </button>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Basic Elements */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-muted-foreground/80 px-1 block">
          Basic Elements
        </span>
        <div className="space-y-2">
          {CERNE_QUESTION_TYPES.filter((q) => q.group === "basic").map(renderQuestionButton)}
        </div>
      </div>

      {/* Additional Elements Dropdown */}
      <div className="pt-2 border-t border-border/40">
        <button
          type="button"
          onClick={() => setIsAdditionalElementsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between py-1.5 px-1 rounded-md text-xs font-semibold text-muted-foreground/80 hover:text-foreground hover:bg-muted/40 transition-colors group select-none text-left cursor-pointer"
        >
          <span>Additional Elements</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-200 group-hover:text-foreground",
              !isAdditionalElementsOpen && "-rotate-90"
            )}
          />
        </button>

        {isAdditionalElementsOpen && (
          <div className="space-y-2 mt-2 pt-1 transition-all">
            {CERNE_QUESTION_TYPES.filter((q) => q.group === "additional").map(renderQuestionButton)}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionInventory;
