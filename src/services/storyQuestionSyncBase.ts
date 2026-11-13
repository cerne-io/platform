
// Default story question to use when nothing is saved and we explicitly need a fallback
export const DEFAULT_STORY_QUESTION = "";

/**
 * Process AI response to extract a clean question string
 */
export const processAIResponse = (response: string): string => {
  if (!response) return "";

  // Clean up the response
  return response.trim();
};

/**
 * Extract question from legacy response format
 */
export const extractQuestionFromLegacyResponse = (responseData: unknown): string | null => {
  if (!responseData) return null;

  // Handle string response
  if (typeof responseData === 'string') {
    return responseData.trim();
  }

  // Handle object response
  if (typeof responseData === 'object') {
    const data = responseData as Record<string, unknown>;
    // Check for question property
    if ('question' in data && typeof data.question === 'string') {
      return data.question.trim();
    }

    // Check for storyQuestion property
    if ('storyQuestion' in data && typeof data.storyQuestion === 'string') {
      return data.storyQuestion.trim();
    }
  }

  return null;
};
