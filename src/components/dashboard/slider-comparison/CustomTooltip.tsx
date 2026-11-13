import React from "react";
import { TooltipProps } from "recharts";

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card p-2 border rounded-md shadow-md">
        <p className="font-medium text-sm">{data.storyTitle}</p>
      </div>
    );
  }

  return null;
};

export default CustomTooltip;
