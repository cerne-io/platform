import { useEffect, useRef } from "react";
import { Story } from "@/types/story";
import { ParticipantFilter } from "../../slider-comparison/useSliderQuestions";
import { ParticipantQuestion } from "@/services/types/designTypes";
import { extractAndUnifyParticipantFilters } from "@/utils/participantFilterUtils";

/**
 * Custom hook to extract participant filters from stories
 */
export function useParticipantFiltersExtract(stories: Story[], formParticipantQuestions?: ParticipantQuestion[]) {
  // Extract participant questions from stories
  const participantFilters = useRef<ParticipantFilter[]>([]);
  
  useEffect(() => {
    participantFilters.current = extractAndUnifyParticipantFilters(stories, formParticipantQuestions || []);
  }, [stories, formParticipantQuestions]);
  
  return participantFilters.current;
}
