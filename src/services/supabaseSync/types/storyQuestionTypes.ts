
import { Json } from '@/integrations/supabase/types';

export type StoryQuestionResponse = {
  storyQuestion?: string;
  question?: string | {
    question?: string;
  };
};

/**
 * Type guard to check if value is a plain object
 */
export const isPlainObject = (value: Json): value is { [key: string]: Json } => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};
