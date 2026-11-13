
import React from "react";
import { BookOpen } from "lucide-react";
import StatsCard from "../StatsCard";

interface TotalStoriesCardProps {
  totalStories: number;
}

const TotalStoriesCard: React.FC<TotalStoriesCardProps> = ({ totalStories }) => {
  return (
    <StatsCard
      title="Total Collection"
      value={totalStories}
      subtitle={totalStories > 0 ? "Experiences collected" : "No experiences yet"}
      icon={BookOpen}
    />
  );
};

export default TotalStoriesCard;
