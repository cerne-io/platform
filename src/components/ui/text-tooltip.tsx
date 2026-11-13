import React, { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface TextTooltipProps {
  text: string;
  content: string;
  className?: string;
}

export const TextTooltip: React.FC<TextTooltipProps> = ({ text, content, className }) => {
  const [isOpen, setIsOpen] = useState(false);

  const trigger = (
    <span
      role="button"
      tabIndex={0}
      className={cn(
        "cursor-help text-[#5D3FD3] dark:text-[#9D7CFF] border-b-[1.5px] border-dashed border-[#5D3FD3]/50 dark:border-[#9D7CFF]/50 hover:border-[#5D3FD3] dark:hover:border-[#9D7CFF] transition-colors",
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }
      }}
    >
      {text}
    </span>
  );

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-sm text-foreground dark:text-gray-100 whitespace-pre-line">{content}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="sr-only">Term Information</DialogTitle>
          <DialogDescription className="sr-only">Detailed information about this term</DialogDescription>
          <div className="p-2">
            <p className="text-sm font-medium text-foreground dark:text-gray-100 whitespace-pre-line">{content}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
