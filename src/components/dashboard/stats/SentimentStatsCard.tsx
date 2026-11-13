import React from "react";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import StatsCard from "../StatsCard";
import { calculatePredominantSentiment } from "@/utils/dashboardUtils";

interface SentimentStatsCardProps {
  totalStories: number;
  positiveStories: number;
  neutralStories: number;
  negativeStories: number;
}

const SentimentStatsCard: React.FC<SentimentStatsCardProps> = ({
  totalStories,
  positiveStories,
  neutralStories,
  negativeStories
}) => {
  const { 
    predominantSentiment, 
    predominantPercentage, 
  } = calculatePredominantSentiment(
    totalStories,
    positiveStories,
    neutralStories,
    negativeStories
  );

  const sentimentColor =
    predominantSentiment === "Positive"
      ? "border-emerald-500/25 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
      : predominantSentiment === "Negative"
        ? "border-rose-500/25 text-rose-700 dark:text-rose-400 bg-rose-500/10"
        : "border-primary/25 text-primary bg-primary/10";

  const badgeClass = cn(
    "shadow-none font-mono tabular-nums text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-sm",
    sentimentColor
  );

  return (
    <StatsCard
      title="Sentiment Breakdown"
      value={predominantSentiment}
      subtitle="Predominant sentiment"
      icon={Users}
      badge={totalStories > 0 ? {
        text: `${predominantPercentage}%`,
        className: badgeClass
      } : undefined}
    />
  );
};

export default SentimentStatsCard;
