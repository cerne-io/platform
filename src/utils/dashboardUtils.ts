
/**
 * Calculates the predominant sentiment and its percentage based on story counts.
 */
export const calculatePredominantSentiment = (
  totalStories: number,
  positiveStories: number,
  neutralStories: number,
  negativeStories: number
) => {
  const predominantSentiment = positiveStories > negativeStories
    ? "Positive"
    : negativeStories > positiveStories
      ? "Negative"
      : "Neutral";

  const predominantCount = positiveStories > negativeStories
    ? positiveStories
    : negativeStories > positiveStories
      ? negativeStories
      : neutralStories;

  const predominantPercentage = totalStories > 0
    ? Math.round((predominantCount / totalStories) * 100)
    : 0;

  const sentimentBadgeClass = positiveStories > negativeStories
    ? "bg-transparent border border-green-500 text-green-500"
    : negativeStories > positiveStories
      ? "bg-transparent border border-red-500 text-red-500"
      : "bg-transparent border border-blue-500 text-blue-500";

  return {
    predominantSentiment,
    predominantPercentage,
    sentimentBadgeClass
  };
};
