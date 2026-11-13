import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface TrianglePickerProps {

  topLabel: string;
  bottomLeftLabel: string;
  bottomRightLabel: string;
  position: { x: number; y: number };
  onChange: (x: number, y: number) => void;
  disabled?: boolean;
  hideHelperText?: boolean;
  compact?: boolean;
}

const TrianglePicker: React.FC<TrianglePickerProps> = ({
  topLabel,
  bottomLeftLabel,
  bottomRightLabel,
  position,
  onChange,
  disabled = false,
  hideHelperText = false,
  compact = false
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "public" });
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Triangle dimensions
  const svgWidth = compact ? 500 : 520;
  const height = compact ? 350 : 346;
  const verticalPadding = compact ? 40 : 60;

  // The triangle itself should maintain its original size (approx 280px base)
  // Original was width 400 with 60 padding, so base was 280
  const triangleBaseWidth = compact ? 350 : 280;

  // Calculate side padding to center the triangle in the wider SVG
  const sidePadding = (svgWidth - triangleBaseWidth) / 2;

  // Triangle vertices
  const topVertex = { x: svgWidth / 2, y: verticalPadding };
  const bottomLeftVertex = { x: sidePadding, y: height - verticalPadding };
  const bottomRightVertex = { x: svgWidth - sidePadding, y: height - verticalPadding };

  // Check if a point is inside the triangle using barycentric coordinates
  const isPointInsideTriangle = (px: number, py: number): boolean => {
    const v0x = bottomRightVertex.x - bottomLeftVertex.x;
    const v0y = bottomRightVertex.y - bottomLeftVertex.y;
    const v1x = topVertex.x - bottomLeftVertex.x;
    const v1y = topVertex.y - bottomLeftVertex.y;
    const v2x = px - bottomLeftVertex.x;
    const v2y = py - bottomLeftVertex.y;

    const dot00 = v0x * v0x + v0y * v0y;
    const dot01 = v0x * v1x + v0y * v1y;
    const dot02 = v0x * v2x + v0y * v2y;
    const dot11 = v1x * v1x + v1y * v1y;
    const dot12 = v1x * v2x + v1y * v2y;

    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return (u >= 0) && (v >= 0) && (u + v <= 1);
  };

  // Convert SVG coordinates to percentage (0-100)
  const svgToPercentage = (svgX: number, svgY: number): { x: number; y: number } => {
    const x = Math.round(((svgX - sidePadding) / triangleBaseWidth) * 100);
    const y = Math.round(((svgY - verticalPadding) / (height - 2 * verticalPadding)) * 100);
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    };
  };

  // Convert percentage (0-100) to SVG coordinates
  const percentageToSvg = (x: number, y: number): { x: number; y: number } => {
    const svgX = sidePadding + (x / 100) * triangleBaseWidth;
    const svgY = verticalPadding + (y / 100) * (height - 2 * verticalPadding);
    return { x: svgX, y: svgY };
  };

  const handleInteraction = (clientX: number, clientY: number) => {
    if (disabled) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * svgWidth;
    const svgY = ((clientY - rect.top) / rect.height) * height;

    if (isPointInsideTriangle(svgX, svgY)) {
      const { x, y } = svgToPercentage(svgX, svgY);
      onChange(x, y);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled) return;
    setIsDragging(true);
    handleInteraction(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging && !disabled) {
      handleInteraction(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (disabled) return;
    setIsDragging(true);
    const touch = e.touches[0];
    handleInteraction(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (isDragging && !disabled) {
      const touch = e.touches[0];
      handleInteraction(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    const handleGlobalTouchEnd = () => setIsDragging(false);

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, []);

  const markerPosition = percentageToSvg(position.x, position.y);

  // Calculate centroid
  const centroid = {
    x: (topVertex.x + bottomLeftVertex.x + bottomRightVertex.x) / 3,
    y: (topVertex.y + bottomLeftVertex.y + bottomRightVertex.y) / 3
  };

  // Calculate altitude (height of the triangle itself, not the SVG height)
  const altitude = height - 2 * verticalPadding;

  // Radii for the background circles
  // The outer circle in the image looks like the incircle (tangent to sides), which is altitude / 3
  // The inner circle looks like half of that
  const outerRadius = altitude / 3;
  const innerRadius = altitude / 6;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgWidth} ${height}`}
        className={`w-full h-auto ${compact ? 'max-w-md max-h-[300px]' : 'max-w-xl'} border border-border rounded-lg bg-card ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-crosshair'
          }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background Circles */}
        <circle
          cx={centroid.x}
          cy={centroid.y}
          r={outerRadius}
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="1.5"
          opacity="0.5"
        />
        <circle
          cx={centroid.x}
          cy={centroid.y}
          r={innerRadius}
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="1.5"
          opacity="0.5"
        />

        {/* Background Lines from Centroid to Vertices */}
        <line
          x1={centroid.x}
          y1={centroid.y}
          x2={topVertex.x}
          y2={topVertex.y}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="1"
          opacity="0.5"
        />
        <line
          x1={centroid.x}
          y1={centroid.y}
          x2={bottomLeftVertex.x}
          y2={bottomLeftVertex.y}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="1"
          opacity="0.5"
        />
        <line
          x1={centroid.x}
          y1={centroid.y}
          x2={bottomRightVertex.x}
          y2={bottomRightVertex.y}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="1"
          opacity="0.5"
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
          className="text-sm font-bold fill-foreground"
        >
          {topLabel}
        </text>

        <text
          x={bottomLeftVertex.x}
          y={bottomLeftVertex.y + 20}
          textAnchor="middle"
          className="text-sm font-bold fill-foreground"
        >
          {bottomLeftLabel}
        </text>

        <text
          x={bottomRightVertex.x}
          y={bottomRightVertex.y + 20}
          textAnchor="middle"
          className="text-sm font-bold fill-foreground"
        >
          {bottomRightLabel}
        </text>

        {/* Position marker */}
        <circle
          cx={markerPosition.x}
          cy={markerPosition.y}
          r="8"
          fill="hsl(var(--primary))"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="2"
          className={isDragging ? 'opacity-80' : 'opacity-100'}
        />
      </svg>

      {!hideHelperText && (
        <div className="text-xs text-muted-foreground text-center">
          {t('form.click_drag')}
        </div>
      )}
    </div>
  );
};

export default TrianglePicker;
