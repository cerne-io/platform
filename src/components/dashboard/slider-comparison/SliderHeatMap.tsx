import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";


import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { getPointColor } from "./utils";
import { SliderPoint } from "./types";

interface SliderHeatMapProps {
    points: SliderPoint[];
    xAxisLabel: string;
    yAxisLabel: string;
    svgRef?: React.RefObject<SVGSVGElement>;
    colorByEmotions?: boolean;
}

const COLOR_SCALES = {
    Blues: d3.interpolateBlues,
    Viridis: d3.interpolateViridis,
    Plasma: d3.interpolatePlasma,
    Inferno: d3.interpolateInferno,
    Magma: d3.interpolateMagma,
    Warm: d3.interpolateWarm,
    Cool: d3.interpolateCool,
};

const SliderHeatMap: React.FC<SliderHeatMapProps> = ({
    points,
    xAxisLabel,
    yAxisLabel,
    svgRef: externalSvgRef,
    colorByEmotions = false,
}) => {
    const internalSvgRef = useRef<SVGSVGElement>(null);
    const svgRef = externalSvgRef || internalSvgRef;

    const containerRef = useRef<HTMLDivElement>(null);
    const [bandwidth, setBandwidth] = useState([20]);
    const [colorScaleName, setColorScaleName] = useState<keyof typeof COLOR_SCALES>("Viridis");
    const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

    // Chart dimensions
    const width = 600;
    const height = 600;
    const padding = 60;

    // Scales
    const xScale = d3.scaleLinear().domain([0, 100]).range([padding, width - padding]);
    const yScale = d3.scaleLinear().domain([0, 100]).range([height - padding, padding]);

    // Zoom behavior
    const zoom = useMemo(() => d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, 8])
        .translateExtent([[0, 0], [width, height]])
        .on("zoom", (event) => {
            if (svgRef.current) {
                const svg = d3.select(svgRef.current);
                svg.select(".zoom-layer").attr("transform", event.transform);

                // Rescale axes
                const newXScale = event.transform.rescaleX(xScale);
                const newYScale = event.transform.rescaleY(yScale);

                svg.select<SVGGElement>(".x-axis").call(d3.axisBottom(newXScale).ticks(5));
                svg.select<SVGGElement>(".y-axis").call(d3.axisLeft(newYScale).ticks(5));
            }
        }), [width, height, xScale, yScale, svgRef]);

    const handleZoomIn = () => {
        if (svgRef.current) {
            d3.select(svgRef.current).transition().call(zoom.scaleBy, 1.2);
        }
    };

    const handleZoomOut = () => {
        if (svgRef.current) {
            d3.select(svgRef.current).transition().call(zoom.scaleBy, 0.8);
        }
    };

    const handleResetZoom = () => {
        if (svgRef.current) {
            d3.select(svgRef.current).transition().call(zoom.transform, d3.zoomIdentity);
        }
    };

    useEffect(() => {
        if (!svgRef.current || points.length === 0) return;

        const svg = d3.select(svgRef.current);

        // Initialize zoom
        svg.call(zoom);

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
            .bandwidth(bandwidth[0])
            .thresholds(20);

        const density = contourDensity(svgPoints);

        // Color scale
        const colorScale = d3.scaleSequential(COLOR_SCALES[colorScaleName])
            .domain([0, d3.max(density, d => d.value) || 0.01]);

        // Draw contours
        contourGroup.selectAll("path")
            .data(density)
            .enter()
            .append("path")
            .attr("d", d3.geoPath())
            .attr("fill", d => colorScale(d.value))
            .attr("stroke", "rgba(0,0,0,0.1)")
            .attr("stroke-width", 0.5)
            .attr("opacity", 0.8)
            .on("mouseover", (event, d) => {
                const [x, y] = d3.pointer(event, containerRef.current);
                const estimatedDensity = d.value.toFixed(4);
                setTooltip({
                    x,
                    y,
                    content: `Density: ${estimatedDensity}`
                });
                d3.select(event.currentTarget as SVGRectElement).attr("stroke", "var(--primary)").attr("stroke-width", 1.5);
            })
            .on("mousemove", (event) => {
                const [x, y] = d3.pointer(event, containerRef.current);
                setTooltip(prev => prev ? { ...prev, x, y } : null);
            })
            .on("mouseout", (event) => {
                setTooltip(null);
                d3.select(event.currentTarget as SVGRectElement).attr("stroke", "rgba(255,255,255,0.05)").attr("stroke-width", 0.5);
            });

        // Draw Axes (Initial)
        svg.select<SVGGElement>(".x-axis").call(d3.axisBottom(xScale).ticks(5));
        svg.select<SVGGElement>(".y-axis").call(d3.axisLeft(yScale).ticks(5));

    }, [points, bandwidth, colorScaleName, xScale, yScale, zoom, svgRef]);

    return (
        <Card className="w-full shadow-md border-opacity-50 bg-white dark:bg-[#161B22] dark:border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-blue-100 dark:border-white/10">
                <CardTitle className="text-base font-medium">Interactive Heat Map</CardTitle>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" onClick={handleZoomIn} aria-label="Zoom in" title="Zoom in"><ZoomIn className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" onClick={handleZoomOut} aria-label="Zoom out" title="Zoom out"><ZoomOut className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" onClick={handleResetZoom} aria-label="Reset zoom" title="Reset zoom"><RotateCcw className="h-4 w-4" /></Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col space-y-4">
                    <div ref={containerRef} className="relative flex justify-center border dark:border-white/10 rounded-md bg-card p-4 overflow-hidden">
                        <svg
                            ref={svgRef}
                            viewBox={`0 0 ${width} ${height}`}
                            className="w-full max-w-2xl"
                        >
                            <defs>
                                <clipPath id="chart-area-clip">
                                    <rect x={padding} y={padding} width={width - 2 * padding} height={height - 2 * padding} />
                                </clipPath>
                            </defs>

                            <g className="zoom-layer">
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

                                {/* Data Points (Overlay) */}
                                {points.map((point, index) => {
                                    let fillColor = "hsl(var(--foreground))";
                                    let opacity = "0.3";

                                    if (colorByEmotions && point.story) {
                                        opacity = "1"; // Make points more visible when colored
                                        const sentiment = point.story.feelingSentiment;
                                        const feeling = point.story.feeling;

                                        if (sentiment === "positive") fillColor = "#4CAF50";
                                        else if (sentiment === "negative") fillColor = "#F44336";
                                        else if (sentiment === "neutral") fillColor = "#2196F3";
                                        else if (feeling) fillColor = getPointColor(feeling);
                                        else fillColor = "#9E9E9E";
                                    }

                                    return (
                                        <circle
                                            key={index}
                                            cx={xScale(point.x)}
                                            cy={yScale(point.y)}
                                            r="3"
                                            fill={fillColor}
                                            opacity={opacity}
                                            pointerEvents="none"
                                            clipPath="url(#chart-area-clip)"
                                        />
                                    );
                                })}
                            </g>

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
                        </svg>

                        {/* Tooltip */}
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
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium">Smoothness (Bandwidth): {bandwidth[0]}</label>
                            <Slider
                                value={bandwidth}
                                onValueChange={setBandwidth}
                                min={5}
                                max={50}
                                step={1}
                            />
                        </div>
                        <div className="w-40 space-y-2">
                            <label className="text-sm font-medium">Color Scale</label>
                            <Select value={colorScaleName} onValueChange={(v) => setColorScaleName(v as keyof typeof COLOR_SCALES)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.keys(COLOR_SCALES).map(name => (
                                        <SelectItem key={name} value={name}>{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </CardContent>


        </Card>
    );
};

export default SliderHeatMap;
