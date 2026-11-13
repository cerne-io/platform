import React, { useMemo, useState } from "react";
import { Story } from "@/types/story";
import { useProject } from "@/contexts/ProjectContext";
import TriangleAnalysisCard from "./TriangleAnalysisCard";
import TriangleFilterSection, { TriangleFilters } from "./TriangleFilterSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Triangle, Download } from "lucide-react";
import { exportTriangleSummaryCSV } from "@/utils/story/triangleExportUtils";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useFormDataQuery } from "@/hooks/queries/useFormDataQuery";
import { clampToTrianglePercentage } from "@/utils/math/triangleUtils";
import { getBaseLabel } from "@/utils/participantFilterUtils";

interface TriangleInsightsSectionProps {
    stories: Story[];
    isLoading?: boolean;
    isPublic?: boolean;
    projectId?: string;
    isActiveProject?: boolean;
    initialContext?: import('./TriangleSelectionTypes').TriangleComparisonContext | null;
    driftNotice?: string;
}

interface GroupedTriangleData {
    questionId: string;
    questionText: string;
    topLabel: string;
    bottomLeftLabel: string;
    bottomRightLabel: string;
    responses: {
        x_position: number;
        y_position: number;
        story: Story;
    }[];
}

const TriangleInsightsSection: React.FC<TriangleInsightsSectionProps> = ({
    stories,
    isLoading = false,
    isPublic = false,
    projectId,
    isActiveProject,
    initialContext,
    driftNotice
}) => {
    const { activeProject } = useProject();
    const effectiveProjectId = projectId || activeProject?.id;

    // Fetch form data to get the default language questions
    const { data: formData } = useFormDataQuery(effectiveProjectId, isPublic);
    const defaultTriangleQuestions = useMemo(() => formData?.triangleQuestions || [], [formData?.triangleQuestions]);

    const [filters, setFilters] = useState<TriangleFilters>({});
    const [colorByEmotions, setColorByEmotions] = useState(false);

    // Filter stories
    const filteredStories = useMemo(() => {
        const result: Story[] = [];
        const len = stories.length;
        const selectedFeelings = filters.feelings ?? [];

        for (let i = 0; i < len; i++) {
            const story = stories[i];

            // Filter by feeling (multi-select, OR logic)
            if (selectedFeelings.length > 0) {
                const matches = selectedFeelings.some(f => {
                    if (f.startsWith("sentiment:")) {
                        const targetSentiment = f.replace("sentiment:", "") as "positive" | "neutral" | "negative";
                        return story.feelingSentiment === targetSentiment;
                    }
                    return story.feeling === f;
                });
                if (!matches) continue;
            }

            if (filters.participantQuestionId && filters.participantResponses && filters.participantResponses.length > 0) {
                let foundResponse;
                if (story.participantResponses) {
                    const responses = story.participantResponses;
                    const rLen = responses.length;
                    for (let j = 0; j < rLen; j++) {
                        if (responses[j].question_id === filters.participantQuestionId) {
                            foundResponse = responses[j];
                            break;
                        }
                    }
                }

                if (!foundResponse || !filters.participantResponses.includes(getBaseLabel(foundResponse.question_id, foundResponse.response, formData?.participantQuestions || []))) {
                    continue;
                }
            } else if (filters.participantQuestionId) {
                // Question selected but no answers yet — show all
            }

            result.push(story);
        }
        return result;
    }, [stories, filters, formData?.participantQuestions]);


    // Aggregate responses by question
    const groupedData = useMemo(() => {
        const groups: Record<string, GroupedTriangleData> = {};

        // Optimization: Standard for loops over arrays are faster than .forEach
        const len = filteredStories.length;
        for (let i = 0; i < len; i++) {
            const story = filteredStories[i];
            if (!story.triangleResponses) continue;

            const responses = story.triangleResponses;
            const rLen = responses.length;
            for (let j = 0; j < rLen; j++) {
                const response = responses[j];
                
                // Group by question_id to combine translations
                const fallbackKey = `${response.question_text}-${response.top_label}-${response.bottom_left_label}-${response.bottom_right_label}`;
                const qId = response.question_id?.toString() || fallbackKey;

                let group = groups[qId];
                if (!group) {
                    // Try to find the default language questions definition to establish the primary texts
                    const defaultQ = defaultTriangleQuestions.find(q => q.id.toString() === qId);
                    
                    group = {
                        questionId: qId,
                        questionText: defaultQ?.question || response.question_text,
                        topLabel: defaultQ?.topLabel || response.top_label || "Top",
                        bottomLeftLabel: defaultQ?.bottomLeftLabel || response.bottom_left_label || "Left",
                        bottomRightLabel: defaultQ?.bottomRightLabel || response.bottom_right_label || "Right",
                        responses: []
                    };
                    groups[qId] = group;
                }

                if (response.x_position !== null && response.y_position !== null) {
                    const clampedPos = clampToTrianglePercentage(response.x_position, response.y_position);
                    group.responses.push({
                        x_position: clampedPos.x,
                        y_position: clampedPos.y,
                        story: story
                    });
                }
            }
        }

        return Object.values(groups).sort((a, b) => a.questionText.localeCompare(b.questionText));
    }, [filteredStories, defaultTriangleQuestions]);

    const handleExportAll = () => {
        exportTriangleSummaryCSV(filteredStories);
    };

    if (isLoading) {
        return <div className="py-8 text-center text-muted-foreground">Loading triangle insights...</div>;
    }

    if (stories.length === 0) {
        return null;
    }

    return (
        <Card className="mt-8 bg-card rounded-xl border border-border/80 shadow-xs">
            <CardHeader className="bg-transparent border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 px-4 sm:px-6 py-4">
                <div className="flex items-center gap-2">
                    <CardTitle className="font-semibold text-2xl sm:text-3xl tracking-tight text-foreground">
                        <Triangle className="mr-2 h-6 w-6 inline" />
                        Triangle Insights
                    </CardTitle>
                    <InfoTooltip contentKey="dashboard-triangle-insights" size={16} />
                </div>
                <Button variant="outline" size="sm" onClick={handleExportAll} className="h-8 text-xs bg-card hover:bg-muted/60 border-border/80 text-foreground transition-all">
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Export All Summaries
                </Button>
            </CardHeader>
            <CardContent className="bg-transparent rounded-b-md pt-6 px-4 sm:px-6">
                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                Analyze how participants positioned their responses on triangle questions.
                            </p>
                        </div>
                    </div>

                    <TriangleFilterSection
                        stories={stories}
                        filters={filters}
                        onFilterChange={setFilters}
                        colorByEmotions={colorByEmotions}
                        setColorByEmotions={setColorByEmotions}
                        formParticipantQuestions={formData?.participantQuestions}
                    />

                    {groupedData.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-border/70 rounded-xl bg-muted/20">
                            <p className="text-sm text-muted-foreground">No triangle data matches the current filters.</p>
                        </div>
                    ) : (
                        <div className="grid gap-8">
                            {groupedData.map((group, index) => (
                                <TriangleAnalysisCard
                                    key={index}
                                    questionText={group.questionText}
                                    responses={group.responses}
                                    topLabel={group.topLabel}
                                    bottomLeftLabel={group.bottomLeftLabel}
                                    bottomRightLabel={group.bottomRightLabel}
                                    colorByEmotions={colorByEmotions}
                                    projectId={effectiveProjectId}
                                    questionId={group.questionId}
                                    isPublic={isPublic}

                                    isActiveProject={isActiveProject}
                                    initialContext={initialContext?.questionId === group.questionId ? initialContext : undefined}
                                    driftNotice={initialContext?.questionId === group.questionId ? driftNotice : undefined}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default TriangleInsightsSection;
