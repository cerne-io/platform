import React, { useRef, useEffect } from "react";
import { Story } from "@/types/story";
import StoryDialog from "@/components/explore/StoryDialog";
import { Cluster } from "@/utils/math/sliderClusterUtils";
import { getPointColor } from "./utils";
import { useDragSelect } from "./useDragSelect";

interface SliderClusterChartProps {
    clusters: Cluster[];
    xAxisLabel: string;
    yAxisLabel: string;
    svgRef?: React.RefObject<SVGSVGElement>;
    colorByEmotions?: boolean;
    selectedStoryIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
}

const SliderClusterChart: React.FC<SliderClusterChartProps> = ({
    clusters,
    xAxisLabel,
    yAxisLabel,
    svgRef,
    colorByEmotions = false,
    selectedStoryIds,
    onSelectionChange
}) => {
    // Drag and Select Hook
    const {
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
    } = useDragSelect({
        onSelectionChange,
        selectedStoryIds
    });

    // Chart dimensions
    const width = 600;
    const height = 600;
    const padding = 60;

    // Scales (Linear 0-100)
    const xScale = (val: number) => padding + (val / 100) * (width - 2 * padding);
    const yScale = (val: number) => (height - padding) - (val / 100) * (height - 2 * padding);

    // Handle clicking a cluster to select all its stories
    const handleClusterClick = (cluster: Cluster, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onSelectionChange) return;

        const storyIds = new Set<string>();
        cluster.points.forEach(p => {
            if (p.story) storyIds.add(String(p.story.id));
        });

        if (storyIds.size > 0) {
            onSelectionChange(storyIds);
        }
    };

    return (
        <div
            ref={containerRef}
            className="flex flex-col items-center w-full select-none relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
        >
            <svg
                ref={svgRef}
                viewBox={`0 0 ${width} ${height}`}
                className="w-full max-w-2xl border border-border rounded-lg bg-card"
            >
                {/* Grid Lines */}
                <g className="grid-layer" opacity="0.1">
                    {[0, 20, 40, 60, 80, 100].map(tick => (
                        <g key={tick}>
                            <line
                                x1={xScale(tick)} y1={padding}
                                x2={xScale(tick)} y2={height - padding}
                                stroke="currentColor"
                            />
                            <line
                                x1={padding} y1={yScale(tick)}
                                x2={width - padding} y2={yScale(tick)}
                                stroke="currentColor"
                            />
                        </g>
                    ))}
                </g>

                {/* Axes */}
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" strokeWidth="1" />
                <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="currentColor" strokeWidth="1" />

                {/* Axis Labels */}
                <text
                    x={width / 2}
                    y={height - 20}
                    textAnchor="middle"
                    className="text-sm font-medium fill-foreground"
                >
                    {xAxisLabel}
                </text>
                <text
                    transform={`translate(20, ${height / 2}) rotate(-90)`}
                    textAnchor="middle"
                    className="text-sm font-medium fill-foreground"
                >
                    {yAxisLabel}
                </text>

                {/* Clusters */}
                {clusters.map((cluster) => (
                    <g key={cluster.id}>
                        {/* Cluster Points */}
                        {cluster.points.map((point, index) => {
                            const hasStory = !!point.story;
                            const isSelected = point.story ? selectedStoryIds?.has(String(point.story.id)) : false;

                            let fillColor = cluster.color || "hsl(var(--primary))";

                            if (colorByEmotions && point.story) {
                                const sentiment = point.story.feelingSentiment;
                                const feeling = point.story.feeling;

                                if (sentiment === "positive") fillColor = "#4CAF50";
                                else if (sentiment === "negative") fillColor = "#F44336";
                                else if (sentiment === "neutral") fillColor = "#2196F3";
                                else if (feeling) fillColor = getPointColor(feeling);
                                else fillColor = "#9E9E9E";
                            }

                            return (
                                <Point
                                    key={`${cluster.id}-${index}`}
                                    x={xScale(point.x)}
                                    y={yScale(point.y)}
                                    r={4}
                                    fill={fillColor}
                                    isSelected={isSelected}
                                    hasStory={hasStory}
                                    story={point.story}
                                    onClick={handlePointClick}
                                    registerPoint={registerPoint}
                                    containerRef={containerRef}
                                />
                            );
                        })}

                        {/* Cluster Centroid */}
                        {(() => {
                            const cx = xScale(cluster.centroid.x);
                            const cy = yScale(cluster.centroid.y);
                            return (
                                <g
                                    transform={`translate(${cx}, ${cy})`}
                                    onClick={(e) => handleClusterClick(cluster, e)}
                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    <title>Click to view all {cluster.points.length} stories in this cluster</title>
                                    <path
                                        d="M0,-8 L2,-2 L8,-2 L4,2 L6,8 L0,4 L-6,8 L-4,2 L-8,-2 L-2,-2 Z"
                                        fill={cluster.color}
                                        stroke="white"
                                        strokeWidth="2"
                                        className="drop-shadow-md"
                                    />
                                </g>
                            );
                        })()}
                    </g>
                ))}
            </svg>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap justify-center gap-4">
                {clusters.map(cluster => (
                    <div
                        key={cluster.id}
                        className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity p-1 rounded hover:bg-muted/50"
                        onClick={(e) => handleClusterClick(cluster, e)}
                        title={`Click to view all ${cluster.points.length} stories in this cluster`}
                    >
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cluster.color }} />
                        <span className="text-xs font-medium">{cluster.label} ({cluster.points.length})</span>
                    </div>
                ))}
            </div>

            {/* Selection Box */}
            {selectionBox && (
                <div
                    className="absolute border-2 border-primary bg-primary/20 pointer-events-none z-10"
                    style={{
                        left: Math.min(selectionBox.startX, selectionBox.currentX),
                        top: Math.min(selectionBox.startY, selectionBox.currentY),
                        width: Math.abs(selectionBox.currentX - selectionBox.startX),
                        height: Math.abs(selectionBox.currentY - selectionBox.startY),
                    }}
                />
            )}

            {selectedStory && (
                <StoryDialog
                    story={selectedStory}
                    isOpen={isDialogOpen}
                    onClose={handleDialogClose}
                />
            )}
        </div>
    );
};

// Reuse Point sub-component pattern for safe ref registration
interface PointProps {
    x: number;
    y: number;
    r: number;
    fill: string;
    isSelected?: boolean;
    hasStory: boolean;
    story?: Story;
    onClick: (story: Story) => void;
    registerPoint: (id: string, x: number, y: number) => void;
    containerRef: React.RefObject<HTMLDivElement>;
}

const Point: React.FC<PointProps> = ({ x, y, r, fill, isSelected, hasStory, story, onClick, registerPoint, containerRef }) => {
    const elementRef = useRef<SVGCircleElement>(null);

    useEffect(() => {
        if (story && elementRef.current && containerRef.current) {
            // Calculate position relative to container
            const pointRect = elementRef.current.getBoundingClientRect();
            const containerRect = containerRef.current.getBoundingClientRect();

            const relativeX = pointRect.left - containerRect.left + pointRect.width / 2;
            const relativeY = pointRect.top - containerRect.top + pointRect.height / 2;

            registerPoint(String(story.id), relativeX, relativeY);
        }
    }); // Run on every render

    return (
        <circle
            ref={elementRef}
            cx={x}
            cy={y}
            r={isSelected ? r * 1.5 : r}
            fill={fill}
            stroke={isSelected ? "#2196F3" : "white"}
            strokeWidth={isSelected ? 2 : 1}
            className={`transition-opacity ${hasStory ? 'cursor-pointer hover:opacity-100 opacity-80' : 'opacity-80'}`}
            onClick={(e) => {
                e.stopPropagation();
                if (story) onClick(story);
            }}
            onMouseDown={(e) => e.stopPropagation()}
        />
    );
};

export default SliderClusterChart;
