import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, GripVertical } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { Reorder } from "framer-motion";

interface InsightListProps {
    title: string;
    items: string[];
    onItemsChange: (items: string[]) => void;
    placeholder?: string;
    isPublic?: boolean;
    tooltipText?: string;
    idPrefix: string;
}

const InsightList: React.FC<InsightListProps> = ({
    title,
    items,
    onItemsChange,
    placeholder = "Add a new item...",
    isPublic = false,
    tooltipText,
    idPrefix,
}) => {
    // Local state for the input field to add new items
    const [newItemText, setNewItemText] = useState("");

    const handleAddItem = () => {
        if (!newItemText.trim()) return;

        // Prevent adding duplicate items to avoid key collisions in Reorder
        if (items.includes(newItemText.trim())) {
            setNewItemText("");
            return;
        }

        const newItems = [...items, newItemText.trim()];
        onItemsChange(newItems);
        setNewItemText("");
    };

    const handleRemoveItem = (itemToRemove: string) => {
        const newItems = items.filter((item) => item !== itemToRemove);
        onItemsChange(newItems);
    };

    const handleReorder = (newOrder: string[]) => {
        onItemsChange(newOrder);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddItem();
        }
    };

    return (
        <div className="flex flex-col space-y-2 min-h-0">
            <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    {title}
                </Label>
                {tooltipText && !isPublic && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p>{tooltipText}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>

            <div className="flex flex-col gap-2">
                {items.length === 0 && isPublic && (
                    <div className="text-sm text-gray-500 italic py-2">
                        No {title.toLowerCase()} recorded yet.
                    </div>
                )}

                {isPublic ? (
                    // Public view (static list)
                    items.map((item, index) => (
                        <div key={`${idPrefix}-${index}`} className="flex items-center gap-2">
                            <div className="flex-none text-muted-foreground">•</div>
                            <div className="flex-1 text-sm text-gray-700">{item}</div>
                        </div>
                    ))
                ) : (
                    // Edit view (drag and drop)
                    <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="flex flex-col gap-2">
                        {items.map((item) => (
                            <Reorder.Item
                                key={item}
                                value={item}
                                className="flex items-center gap-2 group bg-card rounded-md border border-transparent hover:border-border/50 transition-colors relative pr-1"
                            >
                                <div className="cursor-grab active:cursor-grabbing p-1.5 text-muted-foreground/50 hover:text-muted-foreground flex-none">
                                    <GripVertical className="h-4 w-4" />
                                </div>

                                <div className="flex-1 text-sm py-1 break-words">
                                    {item}
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveItem(item)}
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-none"
                                    title="Remove item"
                                    aria-label="Remove item"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>
                )}

                {!isPublic && (
                    <div className="flex items-center gap-2 mt-1 pl-8">
                        <Input
                            value={newItemText}
                            onChange={(e) => setNewItemText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            className="flex-1 h-8 text-sm"
                        />
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleAddItem}
                            disabled={!newItemText.trim()}
                            className="h-8 w-8 p-0"
                            aria-label="Add item"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InsightList;
