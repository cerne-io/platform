import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

import { getPointColor } from "../slider-comparison/utils";
import { SliderPoint } from "../slider-comparison/types";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TriangleHeatMapProps {
    points: SliderPoint[];
    topLabel: string;
    bottomLeftLabel: string;
    bottomRightLabel: string;
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

const TriangleHeatMap: React.FC<TriangleHeatMapProps> = ({
    points,
    topLabel,
    bottomLeftLabel,
    bottomRightLabel,
    svgRef: externalSvgRef,
    colorByEmotions = false,
}) => {
    // ... (existing state)
    const internalSvgRef = useRef<SVGSVGElement>(null);
    const svgRef = externalSvgRef || internalSvgRef;

    const containerRef = useRef<HTMLDivElement>(null);
    const [bandwidth, setBandwidth] = useState([20]);
    const [colorScaleName, setColorScaleName] = useState<keyof typeof COLOR_SCALES>("Blues");
    const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
    const [isZoomEnabled, setIsZoomEnabled] = useState(false);

    // Triangle dimensions (equilateral)
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
    const percentageToSvg = useCallback((x: number, y: number): { x: number; y: number } => {
        const svgX = sidePadding + (x / 100) * triangleBaseWidth;
        const svgY = verticalPadding + (y / 100) * (height - 2 * verticalPadding);
        return { x: svgX, y: svgY };
    }, [sidePadding, triangleBaseWidth, verticalPadding, height]);

    // Calculate centroid
    const centroid = {
        x: (topVertex.x + bottomLeftVertex.x + bottomRightVertex.x) / 3,
        y: (topVertex.y + bottomLeftVertex.y + bottomRightVertex.y) / 3
    };

    // Zoom behavior
    const zoom = useMemo(() => d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
            if (svgRef.current) {
                const svg = d3.select(svgRef.current);
                svg.select(".zoom-layer").attr("transform", event.transform);
            }
        }), [svgRef]);

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
        if (isZoomEnabled) {
            svg.call(zoom);
        } else {
            svg.on(".zoom", null);
            // Reset zoom transform when disabled
            svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
        }

        const contourGroup = svg.select(".contour-group");
        contourGroup.selectAll("*").remove();

        // Prepare data points in SVG coordinates
        const svgPoints = points.map(p => percentageToSvg(p.x, p.y));

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
            .attr("stroke", "currentColor")
            .attr("class", "text-black/10 dark:text-white/10")
            .attr("stroke-width", 0.5)
            .attr("opacity", 0.8)
            .attr("clip-path", "url(#triangle-clip-heatmap)")
            .on("mouseover", (event, d) => {
                const [x, y] = d3.pointer(event, containerRef.current);
                // Estimate count based on value (density) * total points * area factor
                // This is a rough estimation for visualization
                const estimatedDensity = d.value.toFixed(4);
                setTooltip({
                    x,
                    y,
                    content: `Density: ${estimatedDensity}`
                });
                d3.select(event.currentTarget as SVGPathElement).attr("stroke", "#fff").attr("stroke-width", 1.5);
            })
            .on("mousemove", (event) => {
                const [x, y] = d3.pointer(event, containerRef.current);
                setTooltip(prev => prev ? { ...prev, x, y } : null);
            })
            .on("mouseout", (event) => {
                setTooltip(null);
                d3.select(event.currentTarget as SVGPathElement).attr("stroke", "rgba(0,0,0,0.1)").attr("stroke-width", 0.5);
            });

        return () => {
            svg.on(".zoom", null);
        };
    }, [points, bandwidth, colorScaleName, zoom, svgRef, percentageToSvg, isZoomEnabled]);

    return (
        <div className="w-full space-y-4">

            <div className="flex flex-col space-y-4">
                <div ref={containerRef} className="relative flex justify-center overflow-hidden">
                    <svg
                        ref={svgRef}
                        viewBox={`0 0 ${width} ${height}`}
                        className="w-full max-w-2xl"
                    >
                        <defs>
                            <clipPath id="triangle-clip-heatmap">
                                <polygon points={`${topVertex.x},${topVertex.y} ${bottomLeftVertex.x},${bottomLeftVertex.y} ${bottomRightVertex.x},${bottomRightVertex.y}`} />
                            </clipPath>
                        </defs>

                        <g className="zoom-layer">
                            {/* Background Elements */}
                            <g className="background-layer">
                                <circle cx={centroid.x} cy={centroid.y} r={(height - 2 * verticalPadding) / 3} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.2" />
                                <circle cx={centroid.x} cy={centroid.y} r={(height - 2 * verticalPadding) / 6} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.2" />
                                <line x1={centroid.x} y1={centroid.y} x2={topVertex.x} y2={topVertex.y} stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.2" />
                                <line x1={centroid.x} y1={centroid.y} x2={bottomLeftVertex.x} y2={bottomLeftVertex.y} stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.2" />
                                <line x1={centroid.x} y1={centroid.y} x2={bottomRightVertex.x} y2={bottomRightVertex.y} stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.2" />
                            </g>

                            {/* Contours Layer */}
                            <g className="contour-group" />

                            {/* Triangle Frame */}
                            <polygon
                                points={`${topVertex.x},${topVertex.y} ${bottomLeftVertex.x},${bottomLeftVertex.y} ${bottomRightVertex.x},${bottomRightVertex.y}`}
                                fill="transparent"
                                stroke="hsl(var(--foreground))"
                                strokeWidth="2"
                                pointerEvents="none"
                            />

                            {/* Labels */}
                            <text x={topVertex.x} y={topVertex.y - 20} textAnchor="middle" className="text-sm fill-foreground" pointerEvents="none">{topLabel}</text>
                            <text x={bottomLeftVertex.x} y={bottomLeftVertex.y + 25} textAnchor="middle" className="text-sm fill-foreground" pointerEvents="none">{bottomLeftLabel}</text>
                            <text x={bottomRightVertex.x} y={bottomRightVertex.y + 25} textAnchor="middle" className="text-sm fill-foreground" pointerEvents="none">{bottomRightLabel}</text>

                            {/* Data Points (Overlay) */}
                            {points.map((point, index) => {
                                const pos = percentageToSvg(point.x, point.y);
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
                                        cx={pos.x}
                                        cy={pos.y}
                                        r="3"
                                        fill={fillColor}
                                        opacity={opacity}
                                        pointerEvents="none"
                                    />
                                );
                            })}
                        </g>
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

                <div className="flex items-end space-x-4 pt-2">
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

                    <div className="flex items-center space-x-4 pb-2">
                        {isZoomEnabled && (
                            <div className="flex items-center space-x-2 animate-in fade-in duration-200">
                                <Button variant="outline" size="icon" onClick={handleZoomIn} aria-label="Zoom in" title="Zoom in"><ZoomIn className="h-4 w-4" /></Button>
                                <Button variant="outline" size="icon" onClick={handleZoomOut} aria-label="Zoom out" title="Zoom out"><ZoomOut className="h-4 w-4" /></Button>
                                <Button variant="outline" size="icon" onClick={handleResetZoom} aria-label="Reset zoom" title="Reset zoom"><RotateCcw className="h-4 w-4" /></Button>
                            </div>
                        )}
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="zoom-mode"
                                checked={isZoomEnabled}
                                onCheckedChange={setIsZoomEnabled}
                            />
                            <Label htmlFor="zoom-mode">Enable Zoom</Label>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default TriangleHeatMap;
