import React, { useRef, useEffect } from "react";
import { Story } from "@/types/story";
import StoryDialog from "@/components/explore/StoryDialog";
import { getPointColor } from "../slider-comparison/utils";
import { SliderPoint } from "../slider-comparison/types";
import { useDragSelect } from "../slider-comparison/useDragSelect";

interface TriangleChartProps {
    points: SliderPoint[];
    topLabel: string;
    bottomLeftLabel: string;
    bottomRightLabel: string;
    svgRef?: React.RefObject<SVGSVGElement>;
    colorByEmotions?: boolean;
    selectedStoryIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
}

const TriangleChart: React.FC<TriangleChartProps> = ({
    points,
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

    // Triangle dimensions (equilateral) - matching TrianglePicker for consistency
    const width = 520;
    const height = 346; // height of equilateral triangle with width 400 (base 280)
    const verticalPadding = 60;
    const sidePadding = 120;
    const triangleBaseWidth = width - 2 * sidePadding; // 280

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

    // Calculate altitude (height of the triangle itself, not the SVG height)
    const altitude = height - 2 * verticalPadding;

    // Radii for the background circles
    const outerRadius = altitude / 3;
    const innerRadius = altitude / 6;

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
                {/* Background Circles */}
                <circle
                    cx={centroid.x}
                    cy={centroid.y}
                    r={outerRadius}
                    fill="none"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="1"
                    opacity="0.3"
                />
                <circle
                    cx={centroid.x}
                    cy={centroid.y}
                    r={innerRadius}
                    fill="none"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="1"
                    opacity="0.3"
                />

                {/* Background Lines from Centroid to Vertices */}
                <line
                    x1={centroid.x}
                    y1={centroid.y}
                    x2={topVertex.x}
                    y2={topVertex.y}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="1"
                    opacity="0.3"
                />
                <line
                    x1={centroid.x}
                    y1={centroid.y}
                    x2={bottomLeftVertex.x}
                    y2={bottomLeftVertex.y}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="1"
                    opacity="0.3"
                />
                <line
                    x1={centroid.x}
                    y1={centroid.y}
                    x2={bottomRightVertex.x}
                    y2={bottomRightVertex.y}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="1"
                    opacity="0.3"
                />

                {/* Triangle Frame */}
                <polygon
                    points={`${topVertex.x},${topVertex.y} ${bottomLeftVertex.x},${bottomLeftVertex.y} ${bottomRightVertex.x},${bottomRightVertex.y}`}
                    fill="transparent"
                    stroke="hsl(var(--foreground))"
                    strokeWidth="2"
                />

                {/* Vertex labels */}
                <text
                    x={topVertex.x}
                    y={topVertex.y - 15}
                    textAnchor="middle"
                    className="text-sm font-medium fill-foreground"
                >
                    {topLabel}
                </text>

                <text
                    x={bottomLeftVertex.x}
                    y={bottomLeftVertex.y + 20}
                    textAnchor="middle"
                    className="text-sm font-medium fill-foreground"
                >
                    {bottomLeftLabel}
                </text>

                <text
                    x={bottomRightVertex.x}
                    y={bottomRightVertex.y + 20}
                    textAnchor="middle"
                    className="text-sm font-medium fill-foreground"
                >
                    {bottomRightLabel}
                </text>

                {/* Data Points */}
                {points.map((point, index) => {
                    const pos = percentageToSvg(point.x, point.y);
                    const hasStory = !!point.story;
                    const isSelected = point.story ? selectedStoryIds?.has(String(point.story.id)) : false;

                    let fillColor = "hsl(var(--primary))";

                    if (colorByEmotions && point.story) {
                        const sentiment = point.story.feelingSentiment;
                        const feeling = point.story.feeling;

                        if (sentiment === "positive") fillColor = "#059669";
                        else if (sentiment === "negative") fillColor = "#e11d48";
                        else if (sentiment === "neutral") fillColor = "#64748b";
                        else if (feeling) fillColor = getPointColor(feeling);
                        else fillColor = "#94a3b8";
                    }

                    return (
                        <Point
                            key={index}
                            cx={pos.x}
                            cy={pos.y}
                            r={6}
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
            </svg>

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
    }); // Run on every render to handle resizing/updates

    return (
        <circle
            ref={elementRef}
            cx={cx}
            cy={cy}
            r={isSelected ? r * 1.5 : r}
            fill={fill}
            stroke={isSelected ? "#2196F3" : "hsl(var(--primary-foreground))"}
            strokeWidth={isSelected ? 2 : 1}
            className={`transition-opacity ${hasStory ? 'cursor-pointer hover:opacity-100 opacity-60' : 'opacity-60'}`}
            onClick={(e) => {
                e.stopPropagation();
                if (story) onClick(story);
            }}
            onMouseDown={(e) => e.stopPropagation()}
        />
    );
};

export default TriangleChart;
