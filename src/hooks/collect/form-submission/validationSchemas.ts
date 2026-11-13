import { z } from 'zod';
import { sanitizeInput } from '@/utils/sanitizer';

/**
 * Security-focused validation schemas for form submissions
 * These schemas enforce length limits and data type constraints to prevent:
 * - Database constraint violations
 * - XSS attacks through malicious input
 * - DoS through oversized data injection
 */

// Maximum length constants
export const MAX_TITLE_LENGTH = 200;
export const MAX_STORY_TEXT_LENGTH = 10000;
export const MAX_EMOTIONAL_RESPONSE_LENGTH = 500;
export const MAX_ADDITIONAL_COMMENTS_LENGTH = 2000;
export const MAX_QUESTION_TEXT_LENGTH = 500;
export const MAX_LABEL_LENGTH = 100;
export const MAX_PARTICIPANT_RESPONSE_LENGTH = 1000;
export const MIN_SLIDER_VALUE = 0;
export const MAX_SLIDER_VALUE = 100;

/**
 * Sanitize text input by removing potentially dangerous content
 * using DOMPurify to strip all HTML tags
 */
export const sanitizeText = (text: string): string => {
  return sanitizeInput(text);
};

/**
 * Main story data validation schema
 */
export const storyDataSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or less`)
    .transform(sanitizeText),

  text: z.string()
    .max(MAX_STORY_TEXT_LENGTH, `Story text must be ${MAX_STORY_TEXT_LENGTH} characters or less`)
    .transform(sanitizeText),

  emotionalResponse: z.string()
    .max(MAX_EMOTIONAL_RESPONSE_LENGTH, `Emotional response must be ${MAX_EMOTIONAL_RESPONSE_LENGTH} characters or less`)
    .transform(sanitizeText),

  additionalComments: z.string()
    .max(MAX_ADDITIONAL_COMMENTS_LENGTH, `Additional comments must be ${MAX_ADDITIONAL_COMMENTS_LENGTH} characters or less`)
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),

  projectId: z.string().uuid().optional(),
  formId: z.string().optional(),
  isImported: z.boolean().optional(),
  hasAudio: z.boolean().nullable().optional(),
  audioData: z.string().optional(),

  sliderResponses: z.array(z.any()).optional(),
  participantResponses: z.array(z.any()).optional(),
});

/**
 * Slider response validation schema
 */
export const sliderResponseSchema = z.object({
  questionId: z.union([z.string(), z.number()]),

  questionText: z.string()
    .max(MAX_QUESTION_TEXT_LENGTH, `Question text must be ${MAX_QUESTION_TEXT_LENGTH} characters or less`)
    .transform(sanitizeText),

  value: z.number()
    .min(MIN_SLIDER_VALUE, `Slider value must be at least ${MIN_SLIDER_VALUE}`)
    .max(MAX_SLIDER_VALUE, `Slider value must be at most ${MAX_SLIDER_VALUE}`)
    .nullable(),

  responseType: z.enum(['answered', 'skipped']).optional(),

  leftLabel: z.string()
    .max(MAX_LABEL_LENGTH, `Label must be ${MAX_LABEL_LENGTH} characters or less`)
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),

  rightLabel: z.string()
    .max(MAX_LABEL_LENGTH, `Label must be ${MAX_LABEL_LENGTH} characters or less`)
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
});

/**
 * Participant response validation schema
 */
export const participantResponseSchema = z.object({
  questionId: z.string(),

  questionText: z.string()
    .max(MAX_QUESTION_TEXT_LENGTH, `Question text must be ${MAX_QUESTION_TEXT_LENGTH} characters or less`)
    .transform(sanitizeText),

  choiceId: z.string(),

  choiceText: z.string()
    .max(MAX_PARTICIPANT_RESPONSE_LENGTH, `Response must be ${MAX_PARTICIPANT_RESPONSE_LENGTH} characters or less`)
    .transform(sanitizeText),
});

/**
 * Validate story data with detailed error reporting
 * Returns sanitized data if valid, throws with user-friendly message if invalid
 */
export const validateStoryData = (data: unknown) => {
  try {
    return storyDataSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Extract the first error for user-friendly display
      const firstError = error.errors[0];
      throw new Error(firstError.message);
    }
    throw error;
  }
};

export type ValidatedSliderResponse = z.infer<typeof sliderResponseSchema>;
export type ValidatedParticipantResponse = z.infer<typeof participantResponseSchema>;

/**
 * Validate slider responses array
 */
export const validateSliderResponses = (responses: unknown[]): ValidatedSliderResponse[] => {
  if (!responses || responses.length === 0) return [];

  try {
    return responses.map(response => sliderResponseSchema.parse(response));
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new Error(`Invalid slider response: ${firstError.message}`);
    }
    throw error;
  }
};

/**
 * Validate participant responses array
 */
export const validateParticipantResponses = (responses: unknown[]): ValidatedParticipantResponse[] => {
  if (!responses || responses.length === 0) return [];

  try {
    return responses.map(response => participantResponseSchema.parse(response));
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new Error(`Invalid participant response: ${firstError.message}`);
    }
    throw error;
  }
};

/**
 * Postgres integer is 4 bytes (max 2,147,483,647)
 */
export const MAX_SAFE_INT = 2147483647;

/**
 * Convert string identifier to a consistent 32-bit positive integer
 */
export const stringToIntegerId = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % MAX_SAFE_INT;
};

/**
 * Safely convert numeric or string IDs to a 32-bit integer compatible with Postgres integer columns
 */
export const getSafeIntegerId = (id: string | number): number => {
  if (typeof id === 'number') {
    const intId = Math.floor(id);
    return Math.abs(intId) % MAX_SAFE_INT;
  }
  return stringToIntegerId(id as string);
};

