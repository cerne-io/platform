
import React from "react";
import TotalStoriesCard from "./stats/TotalStoriesCard";
import SentimentStatsCard from "./stats/SentimentStatsCard";
import InsightsCard from "./stats/InsightsCard";

interface StatsSectionProps {
  totalStories: number;
  positiveStories: number;
  neutralStories: number;
  negativeStories: number;
}

const StatsSection: React.FC<StatsSectionProps> = React.memo(({
  totalStories,
  positiveStories,
  neutralStories,
  negativeStories
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <TotalStoriesCard totalStories={totalStories} />

      <SentimentStatsCard
        totalStories={totalStories}
        positiveStories={positiveStories}
        neutralStories={neutralStories}
        negativeStories={negativeStories}
      />

      <InsightsCard totalStories={totalStories} />
    </div>
  );
});

StatsSection.displayName = "StatsSection";

export default StatsSection;
