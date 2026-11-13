import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Story } from "@/types/story";
import StoryDialog from "@/components/explore/StoryDialog";

import { getPointColor } from "../slider-comparison/utils";
import { SliderPoint } from "../slider-comparison/types";
import { useDragSelect } from "../slider-comparison/useDragSelect";

interface TriangleContourChartProps {
    points: SliderPoint[];
    topLabel: string;
    bottomLeftLabel: string;
    bottomRightLabel: string;
    svgRef?: React.RefObject<SVGSVGElement>;
    colorByEmotions?: boolean;
    selectedStoryIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
}

const TriangleContourChart: React.FC<TriangleContourChartProps> = ({
    points,
    topLabel,
    bottomLeftLabel,
    bottomRightLabel,
    svgRef: externalSvgRef,
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

    const internalSvgRef = useRef<SVGSVGElement>(null);
    const svgRef = externalSvgRef || internalSvgRef;

    const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

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
    const percentageToSvg = React.useCallback((x: number, y: number): { x: number; y: number } => {
        const svgX = sidePadding + (x / 100) * triangleBaseWidth;
        const svgY = verticalPadding + (y / 100) * (height - 2 * verticalPadding);
        return { x: svgX, y: svgY };
    }, [sidePadding, triangleBaseWidth, verticalPadding, height]);

    // Calculate centroid
    const centroid = {
        x: (topVertex.x + bottomLeftVertex.x + bottomRightVertex.x) / 3,
        y: (topVertex.y + bottomLeftVertex.y + bottomRightVertex.y) / 3
    };

    // Calculate altitude
    const altitude = height - 2 * verticalPadding;
    const outerRadius = altitude / 3;
    const innerRadius = altitude / 6;

    useEffect(() => {
        if (!svgRef.current || points.length === 0) return;

        const svg = d3.select(svgRef.current);
        const contourGroup = svg.select(".contour-group");
        contourGroup.selectAll("*").remove();

        // Prepare data points in SVG coordinates
        const svgPoints = points.map(p => percentageToSvg(p.x, p.y));

        // Generate contours
        const contourDensity = d3.contourDensity<{ x: number; y: number }>()
            .x(d => d.x)
            .y(d => d.y)
            .size([width, height])
            .bandwidth(20) // Adjust for smoothness
            .thresholds(10); // Adjust for number of levels

        const density = contourDensity(svgPoints);

        // Calculate max value for opacity scaling
        const maxVal = d3.max(density, d => d.value) || 0.01;

        // Opacity scale: higher density = more opaque
        const opacityScale = d3.scaleLinear()
            .domain([0, maxVal])
            .range([0.1, 0.8]);

        // Draw contours
        contourGroup.selectAll("path")
            .data(density)
            .enter()
            .append("path")
            .attr("d", d3.geoPath())
            .attr("fill", "none") // No fill
            .attr("stroke", "currentColor")
            .attr("class", "text-slate-900 dark:text-slate-300 pointer-events-auto") // Enable pointer events for toolkit
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", d => opacityScale(d.value)) // Dynamic opacity
            // Clip to the triangle shape
            .attr("clip-path", "url(#triangle-clip)")
            .on("mouseover", (event, d) => {
                const [x, y] = d3.pointer(event, containerRef.current);
                setTooltip({
                    x,
                    y,
                    content: `Density: ${d.value.toFixed(4)}`
                });
                d3.select(event.currentTarget as SVGPathElement).attr("stroke-width", 2.5);
            })
            .on("mousemove", (event) => {
                const [x, y] = d3.pointer(event, containerRef.current);
                setTooltip(prev => prev ? { ...prev, x, y } : null);
            })
            .on("mouseout", (event) => {
                setTooltip(null);
                d3.select(event.currentTarget as SVGPathElement).attr("stroke-width", 1.5);
            });

        // Remove Legend (as requested)
        const legendGroup = svg.select(".legend-group");
        legendGroup.selectAll("*").remove();

    }, [points, svgRef, percentageToSvg, containerRef]);

    return (
        <div
            ref={containerRef}
            className="flex flex-col items-center relative w-full select-none"
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
                    <clipPath id="triangle-clip">
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

                {/* Contours Layer */}
                <g className="contour-group" />

                {/* Legend Layer (Empty now) */}
                <g className="legend-group" />

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

                {/* Data Points (Overlay) */}
                {points.map((point, index) => {
                    const pos = percentageToSvg(point.x, point.y);
                    const hasStory = !!point.story;
                    const isSelected = point.story ? selectedStoryIds?.has(String(point.story.id)) : false;
                    let fillColor = "hsl(var(--primary))";

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
                            key={index}
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

            {tooltip && (
                <div
                    className="absolute z-10 bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-md text-xs border pointer-events-none"
                    style={{
                        left: tooltip.x + 10,
                        top: tooltip.y - 10,
                    }}
                >
                    {tooltip.content}
                </div>
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

export default TriangleContourChart;
