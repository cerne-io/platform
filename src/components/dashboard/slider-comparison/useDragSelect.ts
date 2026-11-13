import { useState, useRef, useCallback } from 'react';
import { Story } from '@/types/story';

interface SelectionBox {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

interface UseDragSelectProps {
    onSelectionChange?: (ids: Set<string>) => void;
    selectedStoryIds?: Set<string>;
}

export const useDragSelect = ({ onSelectionChange, selectedStoryIds }: UseDragSelectProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
    const [selectedStory, setSelectedStory] = useState<Story | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Stores the screen coordinates of points by ID
    const pointCoordinates = useRef<Map<string, { x: number, y: number }>>(new Map());

    // Ref for the container element to calculate relative coordinates
    const containerRef = useRef<HTMLDivElement | null>(null);

    const registerPoint = useCallback((id: string, x: number, y: number) => {
        pointCoordinates.current.set(id, { x, y });
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only start drag if not analyzing a single story details
        // Note: Individual points should stop propagation if they are clicked
        if (selectedStory) return;

        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            setIsDragging(true);
            setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });
        }
    }, [selectedStory]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging || !selectionBox || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setSelectionBox(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
    }, [isDragging, selectionBox]);

    const handleMouseUp = useCallback(() => {
        if (isDragging && selectionBox) {
            // Calculate selection box bounds
            const x1 = Math.min(selectionBox.startX, selectionBox.currentX);
            const x2 = Math.max(selectionBox.startX, selectionBox.currentX);
            const y1 = Math.min(selectionBox.startY, selectionBox.currentY);
            const y2 = Math.max(selectionBox.startY, selectionBox.currentY);

            // Check if it was a meaningful drag (> 5px)
            const isDrag = Math.abs(x2 - x1) > 5 && Math.abs(y2 - y1) > 5;

            if (isDrag) {
                // Find points within bounds
                const newSelectedIds = new Set<string>();

                pointCoordinates.current.forEach((coord, id) => {
                    if (coord.x >= x1 && coord.x <= x2 && coord.y >= y1 && coord.y <= y2) {
                        newSelectedIds.add(id);
                    }
                });

                if (newSelectedIds.size > 0 && onSelectionChange) {
                    onSelectionChange(newSelectedIds);
                }
            } else {
                // It was a click on the background (since startPropagation stopped dot clicks)
                // Clear selection
                if (onSelectionChange && selectedStoryIds && selectedStoryIds.size > 0) {
                    onSelectionChange(new Set());
                }
            }
        }

        setIsDragging(false);
        setSelectionBox(null);
    }, [isDragging, selectionBox, onSelectionChange, selectedStoryIds]);

    const handleMouseLeave = useCallback(() => {
        if (isDragging) {
            handleMouseUp();
        }
    }, [isDragging, handleMouseUp]);

    const handlePointClick = useCallback((story: Story) => {
        // If we are dragging, don't open dialog
        if (isDragging) return;

        setSelectedStory(story);
        setIsDialogOpen(true);
    }, [isDragging]);

    const handleDialogClose = useCallback(() => {
        setIsDialogOpen(false);
        setSelectedStory(null);
    }, []);

    return {
        isDragging,
        selectionBox,
        containerRef,
        registerPoint,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleMouseLeave,
        handlePointClick,
        selectedStory,
        isDialogOpen,
        handleDialogClose
    };
};
