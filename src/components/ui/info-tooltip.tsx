import React, { useState } from "react";
import { HelpCircle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { getTooltipContent } from "@/utils/tooltipContent";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
interface InfoTooltipProps {
  /** Key for the tooltip content, matches a key in tooltipContent */
  contentKey: string;
  /** Optional custom tooltip content, overrides contentKey */
  content?: string;
  /** Icon to use (default: Info) */
  icon?: "info" | "help";
  /** Size of the icon */
  size?: number;

  /** Additional class name for the icon */
  className?: string;
  /** Position of the tooltip */
  position?: "top" | "bottom" | "left" | "right";
}
const InfoTooltip: React.FC<InfoTooltipProps> = ({
  contentKey,
  content,
  icon = "info",
  size = 16,

  className,
  position = "top"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipText = content || getTooltipContent(contentKey);
  const IconComponent = icon === "info" ? Info : HelpCircle;

  // The icon button that will be used in all variations
  // Changed to span to avoid DOM nesting issues (button inside button) when used in AccordionTrigger
  const IconButton = <span role="button" tabIndex={0} className="focus:outline-none cursor-pointer inline-flex" aria-label="View information" onClick={e => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  }} onKeyDown={e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(true);
    }
  }}>
    <span className="flex items-center justify-center p-1">
      <IconComponent size={size} className={cn("text-muted-foreground hover:text-foreground transition-colors", className)} />
    </span>
  </span>;

  // Use dialog for mobile-friendly click interactions
  return <>
    {/* Hover tooltip functionality */}
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {IconButton}
        </TooltipTrigger>
        <TooltipContent side={position} className="max-w-xs">
          <p className="text-sm text-foreground dark:text-gray-100 whitespace-pre-line">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    {/* Click to open dialog functionality */}
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="sr-only">Information</DialogTitle>
        <DialogDescription className="sr-only">
          Detailed information about this feature
        </DialogDescription>
        <div className="p-2">
          <p className="text-sm font-medium text-foreground dark:text-gray-100 whitespace-pre-line">{tooltipText}</p>
        </div>
      </DialogContent>
    </Dialog>
  </>;
};
export { InfoTooltip };