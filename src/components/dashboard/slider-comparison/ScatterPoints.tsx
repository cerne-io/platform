
import React, { useEffect } from "react";
import { getPointColor } from "./utils";
import { Story } from "@/types/story";

interface ScatterPointsProps {
  cx?: number;
  cy?: number;
  fill?: string;
  payload?: {
    feeling?: string;
    feelingSentiment?: "positive" | "neutral" | "negative";
    storyData?: Story;
  };
  colorByEmotions?: boolean;
  onClick?: (story: Story) => void;
  isSelected?: boolean;
  registerPoint?: (id: string, x: number, y: number) => void;
}

const ScatterPoints: React.FC<ScatterPointsProps> = (props) => {
  const { cx = 0, cy = 0, payload, colorByEmotions = false, onClick, isSelected = false, registerPoint } = props;

  useEffect(() => {
    if (registerPoint && payload?.storyData?.id) {
      registerPoint(String(payload.storyData.id), cx, cy);
    }
  }, [cx, cy, payload?.storyData?.id, registerPoint]);

  let pointColor = "#94a3b8"; // slate-400

  if (colorByEmotions && payload) {
    // First try to use the sentiment field if available
    if (payload.feelingSentiment) {
      if (payload.feelingSentiment === "positive") {
        pointColor = "#059669"; // emerald-600
      } else if (payload.feelingSentiment === "negative") {
        pointColor = "#e11d48"; // rose-600
      } else if (payload.feelingSentiment === "neutral") {
        pointColor = "#64748b"; // slate-500
      }
    }
    // Fallback to feeling text if sentiment is not available
    else if (payload.feeling) {
      pointColor = getPointColor(payload.feeling);
    }
  }

  const handlePointClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent drag from starting/clearing selection
    if (payload?.storyData && onClick) {
      onClick(payload.storyData);
    }
  };

  return (
    <circle
      cx={cx}
      cy={cy}
      r={isSelected ? 8 : 6}
      fill={pointColor}
      stroke={isSelected ? "#0f172a" : "#ffffff"}
      strokeWidth={isSelected ? 3 : 1}
      style={{ cursor: payload?.storyData ? 'pointer' : 'default', transition: 'all 0.2s ease' }}
      onClick={handlePointClick}
      onMouseDown={(e) => e.stopPropagation()}
    />
  );
};

export default ScatterPoints;
