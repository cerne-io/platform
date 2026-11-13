
export const getPointColor = (feeling: string): string => {
  const lowerFeeling = feeling.toLowerCase();
  if (lowerFeeling.includes("happy") || lowerFeeling.includes("positive") || lowerFeeling.includes("good")) {
    return "#4CAF50"; // Green for positive
  } else if (lowerFeeling.includes("sad") || lowerFeeling.includes("negative") || lowerFeeling.includes("bad")) {
    return "#F44336"; // Red for negative
  } else if (lowerFeeling.includes("neutral")) {
    return "#2196F3"; // Blue for neutral
  }
  return "#9E9E9E"; // Gray for unknown
};
