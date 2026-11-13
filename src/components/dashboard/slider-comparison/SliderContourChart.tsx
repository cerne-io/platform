import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Story } from "@/types/story";
import StoryDialog from "@/components/explore/StoryDialog";
import { getPointColor } from "./utils";

import { useDragSelect } from "./useDragSelect";

interface SliderContourChartProps {
    points: { x: number; y: number; story?: Story }[];
    xAxisLabel: string;
    yAxisLabel: string;
    svgRef?: React.RefObject<SVGSVGElement>;
    colorByEmotions?: boolean;
    selectedStoryIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
}

const SliderContourChart: React.FC<SliderContourChartProps> = ({
    points,
    xAxisLabel,
    yAxisLabel,
    svgRef: externalSvgRef,
    colorByEmotions = false,
    selectedStoryIds,
    onSelectionChange
}) => {
    const internalSvgRef = useRef<SVGSVGElement>(null);
    const svgRef = externalSvgRef || internalSvgRef;

    const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

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

    // Scales
    const xScale = React.useMemo(() => d3.scaleLinear().domain([0, 100]).range([padding, width - padding]), [padding, width]);
    const yScale = React.useMemo(() => d3.scaleLinear().domain([0, 100]).range([height - padding, padding]), [height, padding]);

    useEffect(() => {
        if (!svgRef.current || points.length === 0) return;

        // ... (existing d3 code for contours)
        // Note: We need to use 'containerRef' for d3.pointer to match the drag coordinates logic
        // But drag logic uses the div wrapper 'containerRef', and d3.pointer usually takes the SVG or an element inside.
        // In the original code it used 'containerRef' which was on the div wrapper.
        // We are using the same 'containerRef' from the hook now, which is attached to the same div.

        const svg = d3.select(svgRef.current);
        const contourGroup = svg.select(".contour-group");
        contourGroup.selectAll("*").remove();

        // Prepare data points in SVG coordinates
        const svgPoints = points.map(p => ({
            x: xScale(p.x),
            y: yScale(p.y)
        }));

        // Generate contours
        const contourDensity = d3.contourDensity<{ x: number; y: number }>()
            .x(d => d.x)
            .y(d => d.y)
            .size([width, height])
            .bandwidth(20) // Match TriangleContourChart default
            .thresholds(10); // Match TriangleContourChart default

        const density = contourDensity(svgPoints);

        // Calculate max density for opacity scaling
        const maxDensity = d3.max(density, d => d.value) || 0.01;

        // Opacity scale
        const opacityScale = d3.scaleLinear()
            .domain([0, maxDensity])
            .range([0.1, 1.0]);

        // Draw contours
        contourGroup.selectAll("path")
            .data(density)
            .enter()
            .append("path")
            .attr("d", d3.geoPath())
            .attr("fill", "none")
            .attr("stroke", "var(--chart-neutral)")
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", d => opacityScale(d.value))
            .attr("opacity", 1)
            .on("mouseover", (event, d) => {
                const [x, y] = d3.pointer(event, containerRef.current);
                setTooltip({
                    x,
                    y,
                    content: `Density: ${d.value.toFixed(4)}`
                });
                d3.select(event.currentTarget as SVGPathElement)
                    .attr("stroke-width", 2.5)
                    .attr("stroke-opacity", 1);
            })
            .on("mousemove", (event) => {
                const [x, y] = d3.pointer(event, containerRef.current);
                setTooltip(prev => prev ? { ...prev, x, y } : null);
            })
            .on("mouseout", (event, d) => {
                setTooltip(null);
                d3.select(event.currentTarget as SVGPathElement)
                    .attr("stroke-width", 1.5)
                    .attr("stroke-opacity", opacityScale(d.value));
            });

        // Axes
        svg.select<SVGGElement>(".x-axis").call(d3.axisBottom(xScale).ticks(5));
        svg.select<SVGGElement>(".y-axis").call(d3.axisLeft(yScale).ticks(5));

    }, [points, svgRef, xScale, yScale, width, height, containerRef]);

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
                className="w-full max-w-2xl border border-border rounded-lg bg-card"
            >
                <defs>
                    <clipPath id="chart-area-clip">
                        <rect x={padding} y={padding} width={width - 2 * padding} height={height - 2 * padding} />
                    </clipPath>
                </defs>

                {/* Grid Lines */}
                <g className="grid-layer" opacity="0.1">
                    {d3.range(0, 101, 20).map(tick => (
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

                {/* Contours Layer */}
                <g className="contour-group" clipPath="url(#chart-area-clip)" />

                {/* Axes */}
                <g className="x-axis" transform={`translate(0, ${height - padding})`} />
                <g className="y-axis" transform={`translate(${padding}, 0)`} />

                {/* Axis Labels */}
                <text
                    x={width / 2}
                    y={height - 10}
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

                {/* Data Points (Overlay) */}
                {points.map((point, index) => {
                    const hasStory = !!point.story;
                    const isSelected = point.story ? selectedStoryIds?.has(String(point.story.id)) : false;

                    // Logic for point color
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

                    // Register point coordinate (SVGs maintain aspect ratio, but we need screen coords)
                    // The hook expects coordinates relative to the CONTAINER
                    // IMPORTANT: SVG scales via viewBox. We need to handle this.
                    // However, useDragSelect uses clientX - rect.left which is pixel coordinates within the div.
                    // If the SVG fills the div, we might need to be careful.
                    // A simpler way: use ref callbacks on the circles to get their exact bounding client rects.
                    // BUT that moves with resize.
                    // Better: The 'registerPoint' expects coordinates relative to the container.
                    // Since the container is the div wrapping the SVG, and the SVG is responsive,
                    // the xScale(point.x) is in SVG user units, NOT pixels if value != pixel.
                    // We need a way to map these.
                    //
                    // Actually, let's keep it simple:
                    // 'useDragSelect' assumes 'selectionBox' is in pixels relative to container.
                    // 'pointCoordinates' should also be in pixels relative to container.
                    //
                    // To get correct pixel coordinates for points inside a scalable SVG,
                    // we can use a ref on each circle and `getBoundingClientRect` inside a `useEffect` or `useLayoutEffect`.
                    // But that's heavy for many points.
                    //
                    // Alternative: The chart has a fixed aspect ratio and max width.
                    // If we assume the container div handles the sizing, we need to know the current scale.
                    //
                    // Let's use a ref callback on the circle element to register its position.

                    return (
                        <Point
                            key={index}
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
            </svg>

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

// Sub-component for individual points to handle ref registration safely
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

    React.useEffect(() => {
        if (story && elementRef.current && containerRef.current) {
            // Calculate position relative to container
            const pointRect = elementRef.current.getBoundingClientRect();
            const containerRect = containerRef.current.getBoundingClientRect();

            const relativeX = pointRect.left - containerRect.left + pointRect.width / 2;
            const relativeY = pointRect.top - containerRect.top + pointRect.height / 2;

            registerPoint(String(story.id), relativeX, relativeY);
        }
    }); // Run on every render to handle resizes/updates

    return (
        <circle
            ref={elementRef}
            cx={x}
            cy={y}
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
            clipPath="url(#chart-area-clip)"
        />
    );
};


export default SliderContourChart;
