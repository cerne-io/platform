
import React from "react";
import { Lightbulb } from "lucide-react";
import StatsCard from "../StatsCard";

interface InsightsCardProps {
  totalStories: number;
}

const InsightsCard: React.FC<InsightsCardProps> = ({ totalStories }) => {
  const insightsCount = totalStories > 0 ? Math.max(1, Math.floor(totalStories / 3)) : 0;
  
  return (
    <StatsCard
      title="Potential Insights"
      value={insightsCount}
      subtitle="Estimated patterns detected"
      icon={Lightbulb}
    />
  );
};

export default InsightsCard;
