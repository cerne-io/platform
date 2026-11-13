
/**
 * Types for project context utilities
 */

/**
 * Props for building project context
 */
export interface ProjectContextProps {
  projectName: string;
  projectDescription?: string;
  storyData?: {
    storyCount: number;
    sentiments: {
      positive: number;
      neutral: number;
      negative: number;
    };
    avgImpact: number | string;
    sliderQuestions?: string[];
    hasSliderData?: boolean;
  };
  activityResponses?: Record<string, unknown>;
  id?: string;
}

/**
 * Activity response data structure
 */
export interface ActivityResponse {
  data?: unknown;
  ar_response?: unknown;
  [key: string]: unknown;
}

/**
 * Form data cache identifiers
 */
export interface FormCacheIdentifiers {
  cacheKey: string;
  timestampKey: string;
}
