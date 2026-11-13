
import { DEFAULT_STORY_QUESTION } from '../storyQuestionService';
import { processAIResponse } from '@/components/design/improver/questionUtils';
import { extractQuestionFromLegacyResponse } from './utils/legacyQuestionUtils';

/**
 * Base module for story question synchronization functionality
 */
export {
  DEFAULT_STORY_QUESTION,
  processAIResponse,
  extractQuestionFromLegacyResponse
};
