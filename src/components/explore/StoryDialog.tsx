
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import StoryDetails from "./StoryDetails";
import { Story } from "@/types/story";

interface StoryDialogProps {
  story: Story;
  isOpen: boolean;
  onClose: () => void;
}

const StoryDialog: React.FC<StoryDialogProps> = ({
  story,
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Story Details</DialogTitle>
          <DialogDescription className="sr-only">
            {story.title}
          </DialogDescription>
        </DialogHeader>
        <StoryDetails story={story} />
      </DialogContent>
    </Dialog>
  );
};

export default StoryDialog;
