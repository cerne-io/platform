
import React, { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import StoryDetails from "./StoryDetails";
import { Story } from "@/types/story";

interface MultiStoryDialogProps {
    stories: Story[];
    initialIndex?: number;
    isOpen: boolean;
    onClose: () => void;
}

const MultiStoryDialog: React.FC<MultiStoryDialogProps> = ({
    stories = [],
    initialIndex = 0,
    isOpen,
    onClose,
}) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    // Reset index when opening with a different initialIndex
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
        }
    }, [isOpen, initialIndex]);

    const handlePrevious = useCallback(() => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : stories.length - 1));
    }, [stories.length]);

    const handleNext = useCallback(() => {
        setCurrentIndex((prev) => (prev < stories.length - 1 ? prev + 1 : 0));
    }, [stories.length]);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") {
                handlePrevious();
            } else if (e.key === "ArrowRight") {
                handleNext();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, handleNext, handlePrevious]);

    if (!stories || stories.length === 0) return null;

    const currentStory = stories[currentIndex];



    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 border-b flex-shrink-0">
                    <DialogTitle className="flex items-center justify-between">
                        <span>Story Browser</span>
                        <span className="text-sm font-normal text-muted-foreground mr-8">
                            Story {currentIndex + 1} of {stories.length}
                        </span>
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Browsing {stories.length} selected stories. Currently showing story {currentIndex + 1}.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6">
                    <StoryDetails story={currentStory} />
                </div>

                <div className="p-4 border-t bg-muted/20 flex items-center justify-between flex-shrink-0">
                    <Button
                        variant="outline"
                        onClick={handlePrevious}
                        className="gap-2"
                        disabled={stories.length <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </Button>
                    <div className="text-sm text-muted-foreground hidden sm:block">
                        Use <kbd className="px-1 py-0.5 rounded bg-muted border font-mono text-xs">←</kbd> and <kbd className="px-1 py-0.5 rounded bg-muted border font-mono text-xs">→</kbd> keys to navigate
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleNext}
                        className="gap-2"
                        disabled={stories.length <= 1}
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default MultiStoryDialog;
