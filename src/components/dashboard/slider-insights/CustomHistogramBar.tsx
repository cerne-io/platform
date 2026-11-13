import React from "react";
import { Rectangle } from "recharts";

interface CustomBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  colorByEmotions: boolean;
  positive: number;
  negative: number;
  neutral: number;
  count: number;
}

const CustomHistogramBar: React.FC<CustomBarProps> = (props) => {
  const { x = 0, y = 0, width = 0, height = 0, colorByEmotions, positive, negative, neutral, count } = props;

  if (!colorByEmotions) {
    return <Rectangle x={x} y={y} width={width} height={height} fill="var(--chart-neutral)" radius={[3, 3, 0, 0]} />;
  }

  // If no data or not using emotion coloring, return a regular bar
  if (count === 0) {
    return <Rectangle x={x} y={y} width={width} height={height} fill="var(--chart-neutral)" radius={[3, 3, 0, 0]} />;
  }

  // Calculate heights for each sentiment section
  const positiveRatio = positive / count;
  const negativeRatio = negative / count;
  const neutralRatio = neutral / count;

  const positiveHeight = height * positiveRatio;
  const negativeHeight = height * negativeRatio;
  const neutralHeight = height * neutralRatio;

  // Render stacked bars for each sentiment
  return (
    <g>
      {positiveRatio > 0 && (
        <Rectangle
          x={x}
          y={y + height - positiveHeight}
          width={width}
          height={positiveHeight}
          fill="var(--chart-positive)"
          // Only round the bottom if there are no neutral or negative blocks below
        />
      )}
      {neutralRatio > 0 && (
        <Rectangle
          x={x}
          y={y + height - positiveHeight - neutralHeight}
          width={width}
          height={neutralHeight}
          fill="var(--chart-neutral)"
        />
      )}
      {negativeRatio > 0 && (
        <Rectangle
          x={x}
          y={y}
          width={width}
          height={negativeHeight}
          fill="var(--chart-negative)"
          radius={[3, 3, 0, 0]}
        />
      )}
    </g>
  );
};

export default CustomHistogramBar;
