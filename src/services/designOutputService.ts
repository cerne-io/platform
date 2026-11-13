
/**
 * Central export file for design output services
 */

// Re-export sync services
export { 
  getStoryQuestionWithSync, 
  saveStoryQuestionWithSync 
} from './sync/storyQuestionSyncService';

export { 
  getSliderQuestionsWithSync, 
  saveSliderQuestionsWithSync 
} from './sync/sliderQuestionsSyncService';

export { 
  getParticipantQuestionsWithSync, 
  saveParticipantQuestionsWithSync 
} from './sync/participantQuestionsSyncService';

// Re-export these functions from their respective services
export { 
  getStoryQuestion, 
  getSliderQuestions, 
  getParticipantQuestions,
  isFormDesigned 
} from './formDesignService';

// Also explicitly export the types so they can be imported from this file
export type { SliderQuestion, ParticipantQuestion } from './types/designTypes';

// Also export the save functions
export { saveSliderQuestions } from './sliderQuestionsService';
export { saveParticipantQuestions } from './participantQuestionsService';
export { saveStoryQuestion } from './storyQuestionService';

// Export the isAuthenticated function for convenience
export { isAuthenticated } from './supabaseSync/core/authUtils';

// Export access functions for getting questions from anywhere
export { 
  getProjectSliderQuestions,
  getSliderQuestionById,
  findSliderQuestionsByText
} from './accessQuestions/sliderQuestionsAccess';
