import React, { useMemo, useRef, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { Story } from "@/types/story";
import TriangleStats from "./TriangleStats";
import TriangleClusterStats from "./TriangleClusterStats";
import TriangleExportMenu from "./TriangleExportMenu";
import { SelectionActionBar } from "./SelectionActionBar";
import { PinnedSelectionsPanel } from "./PinnedSelectionsPanel";
import { TriangleComparisonContext } from "./TriangleSelectionTypes";
import { ComparisonWorkspaceDialog } from "./ComparisonWorkspaceDialog";
import { useComparisonSelections } from "../shared/useComparisonSelections";
import { calculateTriangleStats } from "@/utils/math/triangleUtils";
import { kMeansCluster, findOptimalK, assignClusterLabels } from "@/utils/math/triangleClusterUtils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MultiStoryDialog from "@/components/explore/MultiStoryDialog";
import { SectionLoader } from "@/components/ui/SectionLoader";
import { Info } from "lucide-react";

// Lazy load chart components
const TriangleChart = lazy(() => import("./TriangleChart"));
const TriangleContourChart = lazy(() => import("./TriangleContourChart"));
const TriangleHeatMap = lazy(() => import("./TriangleHeatMap"));
const TriangleClusterChart = lazy(() => import("./TriangleClusterChart"));
const DashboardObservationsCard = lazy(() => import("../shared/DashboardObservationsCard"));

interface TriangleResponse {
    x_position: number;
    y_position: number;
    story: Story;
}

interface TriangleAnalysisCardProps {
    questionText: string;
    responses: TriangleResponse[];
    topLabel: string;
    bottomLeftLabel: string;
    bottomRightLabel: string;
    colorByEmotions?: boolean;
    projectId?: string;
    questionId?: string;
    isPublic?: boolean;
    isActiveProject?: boolean;
    initialContext?: TriangleComparisonContext;
    driftNotice?: string;
}

const TriangleAnalysisCard: React.FC<TriangleAnalysisCardProps> = ({
    questionText,
    responses,
    topLabel,
    bottomLeftLabel,
    bottomRightLabel,
    colorByEmotions = false,
    projectId,
    questionId,
    isPublic = false,

    isActiveProject,
    initialContext,
    driftNotice
}) => {
    const [viewMode, setViewMode] = React.useState<string>('scatter');
    const [showInfo, setShowInfo] = React.useState(false);
    const svgRef = useRef<SVGSVGElement>(null); // This ref needs to be passed to the active chart if we want PNG export of that specific chart

    // Selection state & Compare Workspace state via custom hook
    const {
        selectedStoryIds,
        setSelectedStoryIds,
        groupA,
        groupB,
        isCompareDialogOpen,
        setIsCompareDialogOpen,
        handleClearSelection,
        handleSaveGroup,
        handleClearGroup,
        activeComparisonContext
    } = useComparisonSelections(questionId, projectId, initialContext);

    // Dialog state (MultiStoryDialog)
    const [dialogStoryIds, setDialogStoryIds] = React.useState<string[]>([]);
    const [isMultiStoryDialogOpen, setIsMultiStoryDialogOpen] = React.useState(false);

    const stats = useMemo(() => calculateTriangleStats(responses), [responses]);

    // Transform responses for the chart
    const chartPoints = useMemo(() =>
        responses.map(r => ({ x: r.x_position, y: r.y_position, story: r.story })),
        [responses]
    );

    // Compute clusters only when clusters view mode is active
    const clusters = useMemo(() => {
        if (viewMode !== 'clusters') return [];
        if (chartPoints.length < 3) return [];
        const k = findOptimalK(chartPoints);
        const rawClusters = kMeansCluster(chartPoints, k);
        return assignClusterLabels(rawClusters, topLabel, bottomLeftLabel, bottomRightLabel);
    }, [chartPoints, topLabel, bottomLeftLabel, bottomRightLabel, viewMode]);

    // Get stories for export (and for MultiStoryDialog)
    const stories = useMemo(() => responses.map(r => r.story), [responses]);

    // Optimization: Pre-compute a Map of all stories for O(1) lookups.
    // This depends only on 'stories' so it won't rebuild during rapid drag-selection updates.
    const storiesMap = useMemo(() => {
        return new Map(stories.map(s => [String(s.id), s]));
    }, [stories]);

    // Get stories for the dialog
    const dialogStories = useMemo(() => {
        if (dialogStoryIds.length === 0) return [];

        const result: Story[] = [];
        dialogStoryIds.forEach(id => {
            const story = storiesMap.get(id);
            if (story) result.push(story);
        });
        return result;
    }, [storiesMap, dialogStoryIds]);

    // Calculate bounding box for popover
    const selectionBounds = useMemo(() => {
        if (selectedStoryIds.size === 0) return null;
        
        // Triangle base dimensions matching TriangleChart
        const width = 520;
        const height = 346;
        const verticalPadding = 60;
        const sidePadding = 120;
        const triangleBaseWidth = width - 2 * sidePadding;

        const percentageToSvg = (x: number, y: number) => {
            const svgX = sidePadding + (x / 100) * triangleBaseWidth;
            const svgY = verticalPadding + (y / 100) * (height - 2 * verticalPadding);
            return { x: svgX, y: svgY };
        };

        let minX = width, maxX = 0, minY = height, maxY = 0;
        let found = false;

        chartPoints.forEach(p => {
            if (selectedStoryIds.has(String(p.story.id))) {
                found = true;
                const { x, y } = percentageToSvg(p.x, p.y);
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        });

        if (!found) return null;

        // Clamp x to avoid going off screen
        const rawX = ((minX + maxX) / 2 / width) * 100;
        const clampedX = Math.max(15, Math.min(85, rawX));

        return {
            x: clampedX, // percentage left
            y: (maxY / height) * 100 // percentage top (bottom of selection)
        };
    }, [chartPoints, selectedStoryIds]);

    const handleViewLiveSelection = () => {
        setDialogStoryIds(Array.from(selectedStoryIds));
        setIsMultiStoryDialogOpen(true);
    };

    const handleViewGroup = (id: "A" | "B") => {
        const group = id === "A" ? groupA : groupB;
        if (group) {
            setDialogStoryIds(group.storyIds);
            setIsMultiStoryDialogOpen(true);
        }
    };

    const handleCompareGroups = () => {
        setIsCompareDialogOpen(true);
    };

    const sharedStoryCount = useMemo(() => {
        if (!groupA || !groupB) return 0;
        return groupA.storyIds.filter(id => groupB.storyIds.includes(id)).length;
    }, [groupA, groupB]);

    // comparisonContext is now provided by useComparisonSelections

    return (
        <div className="space-y-6">
            <Card className="w-full bg-card rounded-xl border border-border/80 shadow-xs">
                <CardHeader className="flex flex-col sm:flex-row items-center justify-end space-y-4 sm:space-y-0 pb-2 border-b border-border/50">
                    <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                        <Tabs value={viewMode} onValueChange={setViewMode} className="w-full sm:w-[400px]">
                            <TabsList className="inline-flex min-h-9 items-center justify-center rounded-lg bg-muted/60 p-1 text-muted-foreground w-full sm:w-auto">
                                <TabsTrigger value="scatter" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs text-muted-foreground hover:text-foreground active:scale-95 flex-1 sm:flex-none">Scatter</TabsTrigger>
                                <TabsTrigger value="density" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs text-muted-foreground hover:text-foreground active:scale-95 flex-1 sm:flex-none">Density</TabsTrigger>
                                <TabsTrigger value="heatmap" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs text-muted-foreground hover:text-foreground active:scale-95 flex-1 sm:flex-none">Heat Map</TabsTrigger>
                                <TabsTrigger value="clusters" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs text-muted-foreground hover:text-foreground active:scale-95 flex-1 sm:flex-none">Clusters</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <button
                                onClick={() => setShowInfo(!showInfo)}
                                className={showInfo 
                                    ? "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-primary/30 bg-primary/10 text-primary shadow-2xs transition-all" 
                                    : "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 shadow-2xs transition-all"}
                            >
                                <Info className={showInfo ? "w-3.5 h-3.5 text-primary" : "w-3.5 h-3.5 text-muted-foreground"} />
                                Data Info
                            </button>
                            <TriangleExportMenu stories={stories} svgRef={svgRef} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center min-h-[400px] pt-6">
                        <h3 className="text-base sm:text-lg font-semibold text-foreground text-left mb-2 px-4 w-full break-words tracking-tight [text-wrap:balance]">
                            {questionText}
                        </h3>
                        <div className="relative w-full max-w-2xl mx-auto">
                            <Suspense fallback={<SectionLoader height="h-[350px]" />}>
                                {viewMode === 'scatter' && (
                                    <TriangleChart
                                        points={chartPoints}
                                        topLabel={topLabel}
                                        bottomLeftLabel={bottomLeftLabel}
                                        bottomRightLabel={bottomRightLabel}
                                        svgRef={svgRef}
                                        colorByEmotions={colorByEmotions}
                                        selectedStoryIds={selectedStoryIds}
                                        onSelectionChange={setSelectedStoryIds}
                                    />
                                )}
                                {viewMode === 'density' && (
                                    <TriangleContourChart
                                        points={chartPoints}
                                        topLabel={topLabel}
                                        bottomLeftLabel={bottomLeftLabel}
                                        bottomRightLabel={bottomRightLabel}
                                        svgRef={svgRef}
                                        colorByEmotions={colorByEmotions}
                                        selectedStoryIds={selectedStoryIds}
                                        onSelectionChange={setSelectedStoryIds}
                                    />
                                )}
                                {viewMode === 'heatmap' && (
                                    <TriangleHeatMap
                                        points={chartPoints}
                                        topLabel={topLabel}
                                        bottomLeftLabel={bottomLeftLabel}
                                        bottomRightLabel={bottomRightLabel}
                                        svgRef={svgRef}
                                        colorByEmotions={colorByEmotions}
                                    />
                                )}
                                {viewMode === 'clusters' && (
                                    <TriangleClusterChart
                                        clusters={clusters}
                                        topLabel={topLabel}
                                        bottomLeftLabel={bottomLeftLabel}
                                        bottomRightLabel={bottomRightLabel}
                                        svgRef={svgRef}
                                        colorByEmotions={colorByEmotions}
                                        selectedStoryIds={selectedStoryIds}
                                        onSelectionChange={setSelectedStoryIds}
                                    />
                                )}
                            </Suspense>

                            {/* Floating Selection Bubble */}
                            {selectedStoryIds.size > 0 && selectionBounds && (
                                <div 
                                    className="absolute z-20 w-max"
                                    style={{
                                        left: `${selectionBounds.x}%`,
                                        top: `${selectionBounds.y}%`,
                                        transform: 'translate(-50%, 16px)'
                                    }}
                                >
                                    <SelectionActionBar 
                                        selectedCount={selectedStoryIds.size}
                                        groupA={groupA}
                                        groupB={groupB}
                                        onViewSelected={handleViewLiveSelection}
                                        onSaveGroup={handleSaveGroup}
                                        onClearSelection={handleClearSelection}
                                        selectedStoryIds={selectedStoryIds}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <PinnedSelectionsPanel 
                        groupA={groupA}
                        groupB={groupB}
                        sharedStoryCount={sharedStoryCount}
                        onViewGroup={handleViewGroup}
                        onReplaceGroup={handleSaveGroup}
                        onClearGroup={handleClearGroup}
                        onCompareGroups={handleCompareGroups}
                    />

                    {/* Statistics Section or User Insights */}
                    <div className="mt-8 pt-8 border-t border-border">
                        {!showInfo ? (
                            // Default View: User Insights
                            projectId && questionId && (
                                <div className="w-full">
                                    <Suspense fallback={<SectionLoader height="h-32" />}>
                                        <DashboardObservationsCard
                                            projectId={projectId}
                                            questionKey={questionId}
                                            layout="stacked"
                                            observationTooltip="Look at the information in the graph on the left and describe what you can observe, without interpretations."
                                            isPublic={isPublic}
                                        />
                                    </Suspense>
                                </div>
                            )
                        ) : (
                            // Info View: Stats
                            <div className="space-y-6">
                                <TriangleStats
                                    stats={stats}
                                    topLabel={topLabel}
                                    bottomLeftLabel={bottomLeftLabel}
                                    bottomRightLabel={bottomRightLabel}
                                />
                                {viewMode === 'clusters' && (
                                    <TriangleClusterStats
                                        clusters={clusters}
                                        topLabel={topLabel}
                                        bottomLeftLabel={bottomLeftLabel}
                                        bottomRightLabel={bottomRightLabel}
                                        projectId={projectId}

                                        isActiveProject={isActiveProject}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {activeComparisonContext && (
                <ComparisonWorkspaceDialog
                    isOpen={isCompareDialogOpen}
                    onOpenChange={setIsCompareDialogOpen}
                    context={activeComparisonContext}
                    stories={chartPoints.map(p => p.story)}
                    questionText={questionText}
                    driftNotice={driftNotice}
                    isPublic={isPublic}
                />
            )}

            <MultiStoryDialog
                stories={dialogStories}
                isOpen={isMultiStoryDialogOpen}
                onClose={() => setIsMultiStoryDialogOpen(false)}
            />
        </div>
    );
};

export default TriangleAnalysisCard;
