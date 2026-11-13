
import React, { useState, useRef, useCallback } from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { FormErrorFallback } from "@/components/ui/form-error-fallback";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import CustomTooltip from "./CustomTooltip";
import ScatterPoints from "./ScatterPoints";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/toast";
import { Story } from "@/types/story";
import StoryDialog from "@/components/explore/StoryDialog";

import { debugLog, debugError } from "@/utils/debugLogger";

import { SliderChartDataPoint } from "./types";

interface ScatterPlotChartProps {
  chartData: SliderChartDataPoint[];
  xAxisLabels: {
    left: string;
    right: string;
    text: string;
  };
  yAxisLabels: {
    left: string;
    right: string;
    text: string;
  };
  colorByEmotions: boolean;
  containerRef?: React.Ref<HTMLDivElement>;
  selectedStoryIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

const ScatterPlotChart: React.FC<ScatterPlotChartProps> = ({
  chartData,
  xAxisLabels,
  yAxisLabels,
  colorByEmotions,
  containerRef,
  selectedStoryIds,
  onSelectionChange
}) => {
  debugLog("ScatterPlotChart rendering with data:", chartData?.length, chartData?.[0]);
  const [chartError, setChartError] = useState<Error | null>(null);
  const [attemptingRetry, setAttemptingRetry] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Selection Box State
  const [isDragging, setIsDragging] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);
  const pointCoordinates = useRef<Map<string, { x: number, y: number }>>(new Map());
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  // Register point coordinates from ScatterPoints
  const registerPoint = useCallback((id: string, x: number, y: number) => {
    pointCoordinates.current.set(id, { x, y });
  }, []);

  // Selection Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag if not analyzing a single story details
    if (selectedStory) return;

    // Get relative coordinates
    if (chartContainerRef.current) {
      const rect = chartContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setIsDragging(true);
      setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectionBox || !chartContainerRef.current) return;

    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelectionBox(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  };

  const handleMouseUp = () => {
    if (isDragging && selectionBox) {
      // Calculate selection box bounds
      const x1 = Math.min(selectionBox.startX, selectionBox.currentX);
      const x2 = Math.max(selectionBox.startX, selectionBox.currentX);
      const y1 = Math.min(selectionBox.startY, selectionBox.currentY);
      const y2 = Math.max(selectionBox.startY, selectionBox.currentY);

      // Check if it was a meaningful drag
      const isDrag = Math.abs(x2 - x1) > 5 && Math.abs(y2 - y1) > 5;

      if (isDrag) {
        // Find points within bounds
        const newSelectedIds = new Set<string>(); // Always start fresh on new selection

        pointCoordinates.current.forEach((coord, id) => {
          if (coord.x >= x1 && coord.x <= x2 && coord.y >= y1 && coord.y <= y2) {
            newSelectedIds.add(id);
          }
        });

        if (newSelectedIds.size > 0 && onSelectionChange) {
          onSelectionChange(newSelectedIds);
        }
      } else {
        // It was a click on the background (since startPropagation stopped dot clicks)
        // Clear selection
        if (onSelectionChange && selectedStoryIds && selectedStoryIds.size > 0) {
          onSelectionChange(new Set());
        }
      }
    }

    setIsDragging(false);
    setSelectionBox(null);
  };

  // Handler for chart errors
  const handleChartError = (err: Error) => {
    debugError("Scatter plot error:", err);
    setChartError(err);
  };

  // Reset error and retry rendering the chart
  const handleRetry = () => {
    setAttemptingRetry(true);

    // Short delay to allow React to re-render
    setTimeout(() => {
      setChartError(null);
      setAttemptingRetry(false);
      toast({
        title: "Chart Refreshed",
        description: "The visualization has been refreshed.",
        variant: "info"
      });
    }, 500);
  };

  const handlePointClick = (story: Story) => {
    // If we are dragging, don't open dialog
    if (isDragging) return;

    setSelectedStory(story);
    setIsDialogOpen(true);
  };

  if (attemptingRetry) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Refreshing visualization...</p>
        </div>
      </div>
    );
  }

  if (chartError) {
    return (
      <FormErrorFallback
        error={chartError}
        title="Chart Error"
        message="There was a problem displaying the scatter plot chart."
        resetError={handleRetry}
        componentName="ScatterPlotChart"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Chart
          </Button>
        }
      />
    );
  }

  return (
    <div
      className="aspect-square w-full max-w-2xl mx-auto relative select-none"
      ref={(node) => {
        // Handle local ref
        chartContainerRef.current = node;

        // Handle parent ref
        if (containerRef) {
          if (typeof containerRef === 'function') {
            containerRef(node);
          } else if ('current' in containerRef) {
            // Cast to MutableRefObject to allow assignment
            (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }
        }
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <ErrorBoundary
        fallback={
          <FormErrorFallback
            title="Chart Error"
            message="An error occurred while rendering the chart. Please try changing the selections or refreshing."
            componentName="ScatterPlotChart"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            }
          />
        }
        componentName="ScatterPlotChart"
        onError={handleChartError}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 30 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name={xAxisLabels.text}
              domain={[0, 100]}
              tickCount={5}
              tick={{ fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400 text-xs"
              label={{
                value: xAxisLabels.text,
                position: 'bottom',
                offset: 20,
                style: { textAnchor: 'middle', fill: "currentColor" }
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yAxisLabels.text}
              domain={[0, 100]}
              tickCount={5}
              tick={{ fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400 text-xs"
              label={{
                value: yAxisLabels.text,
                angle: -90,
                position: 'left',
                offset: 10,
                style: { textAnchor: 'middle', fill: "currentColor" }
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              name="Slider Comparison"
              data={chartData}
              fill="#8884d8"
              shape={(props: unknown) => {
                const payload = (props as { payload: { storyData: Story } })?.payload;
                const isSelected = selectedStoryIds?.has(String(payload?.storyData?.id));
                return (
                  <ScatterPoints
                    {...(props as Record<string, unknown>)}
                    colorByEmotions={colorByEmotions}
                    onClick={handlePointClick}
                    isSelected={isSelected}
                    registerPoint={registerPoint}
                  />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </ErrorBoundary>

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
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedStory(null);
          }}
        />
      )}
    </div>
  );
};

export default ScatterPlotChart;
