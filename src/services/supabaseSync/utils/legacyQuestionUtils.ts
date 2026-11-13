
import { Json } from '@/integrations/supabase/types';
import { isPlainObject } from '../types/storyQuestionTypes';

/**
 * Handles extracting questions from legacy response formats
 */
export const extractQuestionFromLegacyResponse = (response: Json | null): string | null => {
  if (!response || !isPlainObject(response)) {
    return null;
  }

  // Check for storyQuestion in response
  if ('storyQuestion' in response && typeof response.storyQuestion === 'string') {
    return response.storyQuestion;
  }

  // Check for nested question structures
  if ('question' in response) {
    const questionData = response.question;
    if (typeof questionData === 'string') {
      return questionData;
    }
    if (isPlainObject(questionData) && 'question' in questionData && typeof questionData.question === 'string') {
      return questionData.question;
    }
  }

  return null;
};
