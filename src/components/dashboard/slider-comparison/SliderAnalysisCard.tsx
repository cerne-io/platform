import React, { useState, useMemo, useRef, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Story } from "@/types/story";
import SliderExportMenu from "./SliderExportMenu";
import SliderStats from "./SliderStats";
import SliderClusterStats from "./SliderClusterStats";
import SliderFilterSection from "./SliderFilterSection";
import { kMeansCluster, findOptimalK, assignClusterLabels, calculateClusterStats } from "@/utils/math/sliderClusterUtils";
import { ParticipantFilter } from "./useSliderQuestions";
import MultiStoryDialog from "@/components/explore/MultiStoryDialog";
import { SectionLoader } from "@/components/ui/SectionLoader";
import { SliderChartDataPoint } from "./types";
import { useComparisonSelections } from "../shared/useComparisonSelections";
import { SelectionActionBar } from "../triangle/SelectionActionBar";
import { PinnedSelectionsPanel } from "../triangle/PinnedSelectionsPanel";
import { ComparisonWorkspaceDialog } from "../triangle/ComparisonWorkspaceDialog";

// Lazy load heavy chart components
const SliderClusterChart = lazy(() => import("./SliderClusterChart"));
const SliderContourChart = lazy(() => import("./SliderContourChart"));
const SliderHeatMap = lazy(() => import("./SliderHeatMap"));
const ScatterPlotChart = lazy(() => import("./ScatterPlotChart"));
const DashboardObservationsCard = lazy(() => import("../shared/DashboardObservationsCard"));

interface SliderAnalysisCardProps {
    stories: Story[];
    xAxisQuestionId: number | string;
    yAxisQuestionId: number | string;
    xAxisLabel: string;
    yAxisLabel: string;
    chartData: SliderChartDataPoint[]; // Data formatted for ScatterPlotChart
    participantFilters: ParticipantFilter[];
    projectId?: string;
    isPublic?: boolean;
    isActiveProject?: boolean;
    initialContext?: import('../triangle/TriangleSelectionTypes').TriangleComparisonContext;
    driftNotice?: string;
}

const SliderAnalysisCard: React.FC<SliderAnalysisCardProps> = ({
    stories,
    xAxisQuestionId,
    yAxisQuestionId,
    xAxisLabel,
    yAxisLabel,
    chartData,
    participantFilters,
    projectId,
    isPublic = false,
    isActiveProject,
    initialContext,
    driftNotice
}) => {
    const [viewMode, setViewMode] = useState<'scatter' | 'density' | 'heatmap' | 'clusters'>('scatter');
    const [showInfo, setShowInfo] = useState(false);
    const [colorByEmotions, setColorByEmotions] = useState(false);
    const [filters, setFilters] = useState<Record<string, Set<string>>>({});
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
        activeComparisonContext,
        driftNotice: hookDriftNotice
    } = useComparisonSelections(String(xAxisQuestionId), projectId, initialContext, "slider_selection", String(yAxisQuestionId));

    const [isMultiStoryDialogOpen, setIsMultiStoryDialogOpen] = useState(false);
    const svgRef = useRef<SVGSVGElement | HTMLDivElement>(null);

    // Filter Logic
    const isFilterActive = Object.values(filters).some(s => s.size > 0);

    const filteredChartData = useMemo(() => {
        if (!isFilterActive) return chartData;

        // Optimization: Pre-filter active choices to avoid evaluating empty sets for every data point,
        // reducing iterations from O(N * TotalFilters) to O(N * ActiveFilters)
        const activeFilters = Object.entries(filters).filter(([, selectedChoices]) => selectedChoices.size > 0);

        return chartData.filter(point => {
            // Optimization: iterate only over the active filters
            for (let i = 0; i < activeFilters.length; i++) {
                const [questionId, selectedChoices] = activeFilters[i];

                // Optimization: Replace .find with standard indexed for loop for faster execution in V8
                let participantResponse;
                if (point.participantResponses) {
                    for (let j = 0; j < point.participantResponses.length; j++) {
                        const r = point.participantResponses[j];
                        if (String(r.question_id) === String(questionId)) {
                            participantResponse = r;
                            break;
                        }
                    }
                }

                const resp = participantResponse?.response;
                const matches = resp !== null && resp !== undefined && (
                  Array.isArray(resp) 
                    ? resp.some(item => selectedChoices.has(String(item))) 
                    : selectedChoices.has(String(resp))
                );

                if (!participantResponse || !matches) {
                    return false;
                }
            }
            return true;
        });
    }, [chartData, filters, isFilterActive]);

    const filteredStories = useMemo(() => {
        return filteredChartData.map(d => d.storyData);
    }, [filteredChartData]);

    // Extract raw points for HeatMap and Clustering from FILTERED stories
    // Optimization: Derive from filteredChartData which already has X/Y values calculated
    const points = useMemo(() => {
        return filteredChartData.map(d => ({
            x: d.x,
            y: d.y,
            story: d.storyData
        }));
    }, [filteredChartData]);

    // Calculate Clusters
    const clusters = useMemo(() => {
        // Optimization: K-means is expensive, so only calculate when needed
        if (viewMode !== 'clusters') return [];

        if (points.length < 3) return [];
        const k = findOptimalK(points);
        const rawClusters = kMeansCluster(points, k);
        return assignClusterLabels(rawClusters, xAxisLabel, yAxisLabel);
    }, [points, xAxisLabel, yAxisLabel, viewMode]);

    const clusterStats = useMemo(() => {
        return calculateClusterStats(clusters, points.length);
    }, [clusters, points.length]);


    // Optimization: Pre-compute a Map of all stories for O(1) lookups.
    // This depends only on 'stories' so it won't rebuild during rapid drag-selection updates.
    const storiesMap = useMemo(() => {
        return new Map(stories.map(s => [String(s.id), s]));
    }, [stories]);

    // Get selected stories for the dialog
    const selectedStories = useMemo(() => {
        if (selectedStoryIds.size === 0) return [];

        // Optimization: Construct the selected stories array using O(1) Map lookups
        // rather than filtering the entire array (O(N)), which runs frequently while dragging.
        const result: Story[] = [];
        selectedStoryIds.forEach(id => {
            const story = storiesMap.get(id);
            if (story) result.push(story);
        });
        return result;
    }, [storiesMap, selectedStoryIds]);


    // handleClearSelection is provided by the hook

    const sharedStoryCount = useMemo(() => {
        if (!groupA || !groupB) return 0;
        return groupA.storyIds.filter(id => groupB.storyIds.includes(id)).length;
    }, [groupA, groupB]);

    return (
        <div className="space-y-6">
            <Card className="shadow-md border-opacity-50 bg-white dark:bg-[#161B22] dark:border-white/10">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-4 sm:gap-0 border-b border-blue-100 dark:border-white/10">
                    <div className="flex items-center space-x-2">
                        <CardTitle className="text-sm font-semibold font-sans text-slate-800 dark:text-slate-200">
                            Analysis View
                        </CardTitle>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">
                                        Switch between different visualizations to analyze the relationship between the selected questions.
                                        Drag to select multiple stories on the scatter plot.
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'scatter' | 'density' | 'heatmap' | 'clusters')} className="w-full sm:w-[400px]">
                            <TabsList className="inline-flex min-h-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-slate-500 w-full sm:w-auto">
                                <TabsTrigger value="scatter" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm hover:text-slate-900 dark:hover:text-slate-100 flex-1 sm:flex-none">Scatter</TabsTrigger>
                                <TabsTrigger value="density" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm hover:text-slate-900 dark:hover:text-slate-100 flex-1 sm:flex-none">Density</TabsTrigger>
                                <TabsTrigger value="heatmap" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm hover:text-slate-900 dark:hover:text-slate-100 flex-1 sm:flex-none">Heat Map</TabsTrigger>
                                <TabsTrigger value="clusters" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm hover:text-slate-900 dark:hover:text-slate-100 flex-1 sm:flex-none">Clusters</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="flex items-center gap-2 justify-end">
                            {selectedStoryIds.size > 0 && (
                                <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClearSelection}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        Clear Selection
                                    </Button>
                                </div>
                            )}
                            <button
                                onClick={() => setShowInfo(!showInfo)}
                                className={showInfo 
                                    ? "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm dark:bg-indigo-900/30 dark:border-indigo-500/30 dark:text-indigo-300" 
                                    : "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"}
                            >
                                <InfoIcon className={showInfo ? "w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" : "w-3.5 h-3.5 text-slate-400"} />
                                Data Info
                            </button>
                            <SliderExportMenu
                                stories={filteredStories}
                                xAxisQuestionId={xAxisQuestionId}
                                yAxisQuestionId={yAxisQuestionId}
                                xAxisLabel={xAxisLabel}
                                yAxisLabel={yAxisLabel}
                                svgRef={svgRef as React.RefObject<SVGSVGElement>}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-4 relative">
                    <div className="flex justify-center min-h-[400px]">
                        <Suspense fallback={<SectionLoader height="h-[400px]" />}>
                            {viewMode === 'scatter' && (
                                <ScatterPlotChart
                                    chartData={filteredChartData}
                                    xAxisLabels={{ text: xAxisLabel, left: "0", right: "100" }}
                                    yAxisLabels={{ text: yAxisLabel, left: "0", right: "100" }}
                                    colorByEmotions={colorByEmotions}
                                    containerRef={svgRef as React.RefObject<HTMLDivElement>}
                                    selectedStoryIds={selectedStoryIds}
                                    onSelectionChange={setSelectedStoryIds}
                                />
                            )}
                            {viewMode === 'density' && (
                                <SliderContourChart
                                    points={points}
                                    xAxisLabel={xAxisLabel}
                                    yAxisLabel={yAxisLabel}
                                    svgRef={svgRef as React.RefObject<SVGSVGElement>}
                                    colorByEmotions={colorByEmotions}
                                    selectedStoryIds={selectedStoryIds}
                                    onSelectionChange={setSelectedStoryIds}
                                />
                            )}
                            {viewMode === 'heatmap' && (
                                <SliderHeatMap
                                    points={points}
                                    xAxisLabel={xAxisLabel}
                                    yAxisLabel={yAxisLabel}
                                    svgRef={svgRef as React.RefObject<SVGSVGElement>}
                                    colorByEmotions={colorByEmotions}
                                />
                            )}
                            {viewMode === 'clusters' && (
                                <SliderClusterChart
                                    clusters={clusters}
                                    xAxisLabel={xAxisLabel}
                                    yAxisLabel={yAxisLabel}
                                    svgRef={svgRef as React.RefObject<SVGSVGElement>}
                                    colorByEmotions={colorByEmotions}
                                    selectedStoryIds={selectedStoryIds}
                                    onSelectionChange={setSelectedStoryIds}
                                />
                            )}
                            {/* Static Selection Action Bar */}
                            {selectedStoryIds.size > 0 && (
                                <div className="absolute top-4 right-4 z-10 hidden md:block">
                                    <SelectionActionBar 
                                        selectedCount={selectedStoryIds.size}
                                        groupA={groupA}
                                        groupB={groupB}
                                        onViewSelected={() => setIsMultiStoryDialogOpen(true)}
                                        onSaveGroup={handleSaveGroup}
                                        onClearSelection={handleClearSelection}
                                        selectedStoryIds={selectedStoryIds}
                                    />
                                </div>
                            )}
                        </Suspense>
                    </div>
                    {/* Mobile Action Bar */}
                    {selectedStoryIds.size > 0 && (
                        <div className="mt-4 flex justify-center md:hidden">
                            <SelectionActionBar 
                                selectedCount={selectedStoryIds.size}
                                groupA={groupA}
                                groupB={groupB}
                                onViewSelected={() => setIsMultiStoryDialogOpen(true)}
                                onSaveGroup={handleSaveGroup}
                                onClearSelection={handleClearSelection}
                                selectedStoryIds={selectedStoryIds}
                            />
                        </div>
                    )}
                    
                    <PinnedSelectionsPanel 
                        groupA={groupA}
                        groupB={groupB}
                        sharedStoryCount={sharedStoryCount}
                        onViewGroup={() => setIsMultiStoryDialogOpen(true)}
                        onReplaceGroup={handleSaveGroup}
                        onClearGroup={handleClearGroup}
                        onCompareGroups={() => setIsCompareDialogOpen(true)}
                    />

                    <SliderFilterSection
                        colorByEmotions={colorByEmotions}
                        setColorByEmotions={setColorByEmotions}
                        participantFilters={participantFilters}
                        filters={filters}
                        setFilters={setFilters}
                    />
                </CardContent>
            </Card>

            {/* Statistics Section or User Insights */}
            {showInfo ? (
                viewMode === 'clusters' ? (
                    <SliderClusterStats
                        stats={clusterStats}
                        clusters={clusters}
                        xAxisLabel={xAxisLabel}
                        yAxisLabel={yAxisLabel}
                        projectId={projectId}
                        sessionToken={undefined}
                        isActiveProject={isActiveProject}
                    />
                ) : (
                    <SliderStats
                        points={points}
                        xAxisLabel={xAxisLabel}
                        yAxisLabel={yAxisLabel}
                    />
                )
            ) : (
                projectId && xAxisQuestionId && yAxisQuestionId && (
                    <Suspense fallback={<SectionLoader height="h-32" />}>
                        <DashboardObservationsCard
                            projectId={projectId}
                            questionKey={`slider-${xAxisQuestionId}-${yAxisQuestionId}`}
                            layout="two-column"
                            isPublic={isPublic}
                        />
                    </Suspense>
                )
            )}
            <MultiStoryDialog
                stories={selectedStories}
                isOpen={isMultiStoryDialogOpen}
                onClose={() => setIsMultiStoryDialogOpen(false)}
            />

            {activeComparisonContext && (
                <ComparisonWorkspaceDialog
                    isOpen={isCompareDialogOpen}
                    onOpenChange={setIsCompareDialogOpen}
                    context={activeComparisonContext}
                    stories={stories}
                    questionText={`${xAxisLabel} vs ${yAxisLabel}`}
                    driftNotice={driftNotice || hookDriftNotice}
                    isPublic={isPublic}
                />
            )}
        </div>
    );
};

export default SliderAnalysisCard;
