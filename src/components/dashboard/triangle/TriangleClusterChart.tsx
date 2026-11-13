import React, { useRef, useEffect } from "react";
import { Story } from "@/types/story";
import StoryDialog from "@/components/explore/StoryDialog";
import { Cluster } from "@/utils/math/triangleClusterUtils";
import { getPointColor } from "../slider-comparison/utils";
import { useDragSelect } from "../slider-comparison/useDragSelect";

interface TriangleClusterChartProps {
    clusters: Cluster[];
    topLabel: string;
    bottomLeftLabel: string;
    bottomRightLabel: string;
    svgRef?: React.RefObject<SVGSVGElement>;
    colorByEmotions?: boolean;
    selectedStoryIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
}

const TriangleClusterChart: React.FC<TriangleClusterChartProps> = ({
    clusters,
    topLabel,
    bottomLeftLabel,
    bottomRightLabel,
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

    // Triangle dimensions (equilateral)
    const width = 520;
    const height = 346;
    const verticalPadding = 60;
    const sidePadding = 120;
    const triangleBaseWidth = width - 2 * sidePadding;

    // Triangle vertices
    const topVertex = { x: width / 2, y: verticalPadding };
    const bottomLeftVertex = { x: sidePadding, y: height - verticalPadding };
    const bottomRightVertex = { x: width - sidePadding, y: height - verticalPadding };

    // Convert percentage (0-100) to SVG coordinates
    const percentageToSvg = (x: number, y: number): { x: number; y: number } => {
        const svgX = sidePadding + (x / 100) * triangleBaseWidth;
        const svgY = verticalPadding + (y / 100) * (height - 2 * verticalPadding);
        return { x: svgX, y: svgY };
    };

    // Calculate centroid
    const centroid = {
        x: (topVertex.x + bottomLeftVertex.x + bottomRightVertex.x) / 3,
        y: (topVertex.y + bottomLeftVertex.y + bottomRightVertex.y) / 3
    };

    // Calculate altitude
    const altitude = height - 2 * verticalPadding;
    const outerRadius = altitude / 3;
    const innerRadius = altitude / 6;

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
                className="w-full max-w-2xl"
            >
                <defs>
                    <clipPath id="triangle-clip-cluster">
                        <polygon points={`${topVertex.x},${topVertex.y} ${bottomLeftVertex.x},${bottomLeftVertex.y} ${bottomRightVertex.x},${bottomRightVertex.y}`} />
                    </clipPath>
                </defs>

                {/* Background Circles */}
                <circle cx={centroid.x} cy={centroid.y} r={outerRadius} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.3" />
                <circle cx={centroid.x} cy={centroid.y} r={innerRadius} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.3" />

                {/* Background Lines */}
                <line x1={centroid.x} y1={centroid.y} x2={topVertex.x} y2={topVertex.y} stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.3" />
                <line x1={centroid.x} y1={centroid.y} x2={bottomLeftVertex.x} y2={bottomLeftVertex.y} stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.3" />
                <line x1={centroid.x} y1={centroid.y} x2={bottomRightVertex.x} y2={bottomRightVertex.y} stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.3" />

                {/* Triangle Frame */}
                <polygon
                    points={`${topVertex.x},${topVertex.y} ${bottomLeftVertex.x},${bottomLeftVertex.y} ${bottomRightVertex.x},${bottomRightVertex.y}`}
                    fill="transparent"
                    stroke="hsl(var(--foreground))"
                    strokeWidth="2"
                    pointerEvents="none"
                />

                {/* Labels */}
                <text x={topVertex.x} y={topVertex.y - 15} textAnchor="middle" className="text-sm font-medium fill-foreground">{topLabel}</text>
                <text x={bottomLeftVertex.x} y={bottomLeftVertex.y + 20} textAnchor="middle" className="text-sm font-medium fill-foreground">{bottomLeftLabel}</text>
                <text x={bottomRightVertex.x} y={bottomRightVertex.y + 20} textAnchor="middle" className="text-sm font-medium fill-foreground">{bottomRightLabel}</text>

                {/* Clusters */}
                {clusters.map((cluster) => (
                    <g key={cluster.id}>
                        {/* Cluster Points */}
                        {cluster.points.map((point, index) => {
                            const pos = percentageToSvg(point.x, point.y);
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
                                    cx={pos.x}
                                    cy={pos.y}
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
                            const pos = percentageToSvg(cluster.centroid.x, cluster.centroid.y);
                            return (
                                <g
                                    transform={`translate(${pos.x}, ${pos.y})`}
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
                        <svg width="16" height="16" viewBox="-10 -10 20 20" className="overflow-visible">
                            <path
                                d="M0,-8 L2,-2 L8,-2 L4,2 L6,8 L0,4 L-6,8 L-4,2 L-8,-2 L-2,-2 Z"
                                fill={cluster.color}
                                stroke="none"
                            />
                        </svg>
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
    cx: number;
    cy: number;
    r: number;
    fill: string;
    isSelected?: boolean;
    hasStory: boolean;
    story?: Story;
    onClick: (story: Story) => void;
    registerPoint: (id: string, x: number, y: number) => void;
    containerRef: React.RefObject<HTMLDivElement>;
}

const Point: React.FC<PointProps> = ({ cx, cy, r, fill, isSelected, hasStory, story, onClick, registerPoint, containerRef }) => {
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
    });

    return (
        <circle
            ref={elementRef}
            cx={cx}
            cy={cy}
            r={isSelected ? r * 1.5 : r}
            fill={fill}
            stroke={isSelected ? "#2196F3" : "hsl(var(--primary-foreground))"}
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

export default TriangleClusterChart;
