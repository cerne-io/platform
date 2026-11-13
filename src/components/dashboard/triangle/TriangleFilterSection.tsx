import React, { useMemo, useState } from "react";
import { Story } from "@/types/story";
import { ParticipantQuestion } from "@/services/types/designTypes";
import { extractAndUnifyParticipantFilters } from "@/utils/participantFilterUtils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { X, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface TriangleFilters {
    feelings?: string[];        // "sentiment:positive" | "sentiment:neutral" | "sentiment:negative" | <feeling name>
    participantQuestionId?: string;
    participantResponses?: string[];  // multi-select answers (raw values)
}

interface TriangleFilterSectionProps {
    stories: Story[];
    filters: TriangleFilters;
    onFilterChange: (filters: TriangleFilters) => void;
    colorByEmotions?: boolean;
    setColorByEmotions?: (value: boolean) => void;
    formParticipantQuestions?: ParticipantQuestion[];
}

const AGGREGATE_OPTIONS = [
    { value: "sentiment:positive", label: "Positive" },
    { value: "sentiment:neutral",  label: "Neutral"  },
    { value: "sentiment:negative", label: "Negative" },
];

// Reusable multi-select popover with checkbox list
interface MultiSelectPopoverProps {
    triggerLabel: string;
    selected: string[];
    onToggle: (value: string) => void;
    onClear: () => void;
    hasSelection: boolean;
    groups: { heading?: string; options: { value: string; label: string }[] }[];
    maxHeight?: string;
}

const MultiSelectPopover: React.FC<MultiSelectPopoverProps> = ({
    triggerLabel,
    selected,
    onToggle,
    onClear,
    hasSelection,
    groups,
    maxHeight = "max-h-52",
}) => {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between font-normal",
                        hasSelection && "border-primary/60"
                    )}
                >
                    <span className="truncate">{triggerLabel}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
                <div className="p-2">
                    {hasSelection && (
                        <button
                            type="button"
                            aria-label="Clear selection"
                            className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                            onClick={onClear}
                        >
                            Clear selection
                        </button>
                    )}
                    {groups.map((group, gi) => (
                        <React.Fragment key={gi}>
                            {gi > 0 && <Separator className="my-2" />}
                            {group.heading && (
                                <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    {group.heading}
                                </p>
                            )}
                            <div className={cn("overflow-y-auto", maxHeight)}>
                                {group.options.map(opt => (
                                    <label
                                        key={opt.value}
                                        className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted transition-colors text-sm"
                                    >
                                        <Checkbox
                                            checked={selected.includes(opt.value)}
                                            onCheckedChange={() => onToggle(opt.value)}
                                        />
                                        {opt.label}
                                    </label>
                                ))}
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
};

const TriangleFilterSection: React.FC<TriangleFilterSectionProps> = ({
    stories,
    filters,
    onFilterChange,
    colorByEmotions = false,
    setColorByEmotions,
    formParticipantQuestions = []
}) => {
    // Extract unique individual feelings
    const feelings = useMemo(() => {
        const unique = new Set<string>();
        const storiesLen = stories.length;
        for (let i = 0; i < storiesLen; i++) {
            const s = stories[i];
            if (s.feeling) unique.add(s.feeling);
        }
        return Array.from(unique).sort();
    }, [stories]);

    // Extract unified participant questions and their possible responses
    const unifiedParticipantFilters = useMemo(() => {
        return extractAndUnifyParticipantFilters(stories, formParticipantQuestions);
    }, [stories, formParticipantQuestions]);

    const participantQuestions = unifiedParticipantFilters;

    // ── Feelings multi-select ──────────────────────────────────────────────
    const selectedFeelings = useMemo(() => filters.feelings ?? [], [filters.feelings]);

    const toggleFeeling = (value: string) => {
        const next = selectedFeelings.includes(value)
            ? selectedFeelings.filter(f => f !== value)
            : [...selectedFeelings, value];
        onFilterChange({ ...filters, feelings: next.length > 0 ? next : undefined });
    };

    const feelingTriggerLabel = useMemo(() => {
        if (selectedFeelings.length === 0) return "All Feelings";
        if (selectedFeelings.length === 1) {
            const v = selectedFeelings[0];
            if (v.startsWith("sentiment:")) {
                const agg = AGGREGATE_OPTIONS.find(o => o.value === v);
                return agg ? agg.label : v;
            }
            return v;
        }
        return `${selectedFeelings.length} selected`;
    }, [selectedFeelings]);

    const feelingGroups = [
        { heading: "By Aggregate", options: AGGREGATE_OPTIONS },
        ...(feelings.length > 0
            ? [{ heading: "Individual Feelings", options: feelings.map(f => ({ value: f, label: f })) }]
            : []),
    ];

    // ── Participant Question single-select ────────────────────────────────
    const handleQuestionChange = (questionId: string) => {
        if (questionId === "all") {
            onFilterChange({ ...filters, participantQuestionId: undefined, participantResponses: undefined });
        } else {
            onFilterChange({ ...filters, participantQuestionId: questionId, participantResponses: undefined });
        }
    };

    // ── Answer multi-select ───────────────────────────────────────────────
    const selectedResponses = useMemo(() => filters.participantResponses ?? [], [filters.participantResponses]);

    const currentQuestionOptions = useMemo(() => {
        if (!filters.participantQuestionId) return [];
        const len = participantQuestions.length;
        for (let i = 0; i < len; i++) {
            if (participantQuestions[i].id === filters.participantQuestionId) {
                return participantQuestions[i].choices.map((r: string) => ({ value: r, label: r }));
            }
        }
        return [];
    }, [participantQuestions, filters.participantQuestionId]);

    const toggleResponse = (value: string) => {
        const next = selectedResponses.includes(value)
            ? selectedResponses.filter(r => r !== value)
            : [...selectedResponses, value];
        onFilterChange({ ...filters, participantResponses: next.length > 0 ? next : undefined });
    };

    const answerTriggerLabel = useMemo(() => {
        if (selectedResponses.length === 0) return "All Answers";
        if (selectedResponses.length === 1) return selectedResponses[0];
        return `${selectedResponses.length} selected`;
    }, [selectedResponses]);

    // ── Active filters & clear ────────────────────────────────────────────
    const clearFilters = () => { onFilterChange({}); };
    const hasActiveFilters = selectedFeelings.length > 0 || !!filters.participantQuestionId;

    return (
        <div className="bg-card border dark:border-white/10 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-medium">Filter Responses</h3>
                <div className="flex items-center space-x-4">
                    {setColorByEmotions && (
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="color-emotions"
                                checked={colorByEmotions}
                                onCheckedChange={setColorByEmotions}
                            />
                            <Label htmlFor="color-emotions">Color by Emotions</Label>
                        </div>
                    )}
                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 lg:px-3">
                            <X className="mr-2 h-4 w-4" />
                            Clear Filters
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Emotional Response – multi-select */}
                <div className="space-y-2">
                    <Label>Emotional Response</Label>
                    <MultiSelectPopover
                        triggerLabel={feelingTriggerLabel}
                        selected={selectedFeelings}
                        onToggle={toggleFeeling}
                        onClear={() => onFilterChange({ ...filters, feelings: undefined })}
                        hasSelection={selectedFeelings.length > 0}
                        groups={feelingGroups}
                    />
                </div>

                {/* Participant Question – single-select */}
                <div className="space-y-2">
                    <Label>Participant Question</Label>
                    <Select value={filters.participantQuestionId || "all"} onValueChange={handleQuestionChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Question" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Questions</SelectItem>
                            {participantQuestions.map(q => (
                                <SelectItem key={q.id} value={q.id}>{q.text}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Answer – multi-select, only visible when a question is selected */}
                {filters.participantQuestionId && (
                    <div className="space-y-2">
                        <Label>Answer</Label>
                        <MultiSelectPopover
                            triggerLabel={answerTriggerLabel}
                            selected={selectedResponses}
                            onToggle={toggleResponse}
                            onClear={() => onFilterChange({ ...filters, participantResponses: undefined })}
                            hasSelection={selectedResponses.length > 0}
                            groups={[{ options: currentQuestionOptions }]}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default TriangleFilterSection;
