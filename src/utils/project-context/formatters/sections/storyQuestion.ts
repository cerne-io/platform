
/**
 * Story question formatting module
 */

/**
 * Format story question
 */
export const formatStoryQuestion = (rawData: Record<string, unknown>): string => {
  let text = '\n\nSTORY QUESTION:\n';

  if (rawData.storyQuestion) {
    const data = rawData.storyQuestion;

    if (typeof data === 'string') {
      text += `• ${data}\n`;
      return text;
    } else if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;
      if (dataObj.question) {
        text += `• ${dataObj.question}\n`;
        return text;
      }

      if (dataObj.story_question) {
        text += `• ${dataObj.story_question}\n`;
        return text;
      }

      // Check for any field that might contain the story question
      for (const [key, value] of Object.entries(dataObj)) {
        if (
          (key.includes('question') || key.includes('prompt')) &&
          typeof value === 'string' &&
          value.trim()
        ) {
          text += `• ${value}\n`;
          return text;
        }
      }
    }
  }

  return '';
};
