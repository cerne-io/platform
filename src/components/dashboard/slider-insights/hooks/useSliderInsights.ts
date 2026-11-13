

import { Story } from "@/types/story";
import { ParticipantQuestion } from "@/services/types/designTypes";
import { useProcessStoryEmotions } from "./useProcessStoryEmotions";
import { useParticipantFiltersExtract } from "./useParticipantFiltersExtract";
import { useSliderQuestionsProcess } from "./useSliderQuestionsProcess";

/**
 * Main hook that combines all slider insights functionality
 */
export function useSliderInsights(stories: Story[], colorByEmotions: boolean, formParticipantQuestions?: ParticipantQuestion[], projectId?: string, isPublic: boolean = false) {
  // Process emotions for stories
  const { 
    processedStories, 
    isProcessing, 
    processingComplete 
  } = useProcessStoryEmotions(stories, colorByEmotions, projectId, isPublic);
  
  // Extract participant filters
  const participantFilters = useParticipantFiltersExtract(stories, formParticipantQuestions);
  
  // Process slider questions
  const {
    questionList,
    selectedQuestionId,
    setSelectedQuestionId,
    selectedQuestion,
    loading
  } = useSliderQuestionsProcess(stories, projectId);
  
  return {
    questionList,
    selectedQuestion,
    selectedQuestionId,
    setSelectedQuestionId,
    processedStories,
    isProcessing,
    processingComplete,
    participantFilters,
    loading
  };
}
