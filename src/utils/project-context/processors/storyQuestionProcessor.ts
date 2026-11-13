import { debugError } from "@/utils/debugLogger";
import { extractLocalizedOrString, isTechnicalField } from "./utils/processingUtils";

/**
 * Process story question
 */
export function processStoryQuestion(context: string, activityResponses: Record<string, unknown>): string {
  let storyQContext = '';
  let hasStoryQ = false;

  // Multiple possible keys for story questions
  const storyQuestionKeys = ['storyQuestion', 'story_question', 'mainQuestion', 'question', 'storyPrompt'];

  // Try all possible locations for story questions
  for (const key of storyQuestionKeys) {
    if (activityResponses[key]) {
      try {
        let storyQ = "";
        const responseData = activityResponses[key];
        
        // Try to extract standard localization format or direct string
        const extracted = extractLocalizedOrString(responseData);
        if (extracted && extracted.length > 15) {
          storyQ = extracted;
          hasStoryQ = true;
        } else if (typeof responseData === 'object' && responseData !== null) {
          // Fallback: Try to find the question in various possible structures
          const questionFields = ['storyQuestion', 'question', 'story_question', 'text', 'finalQuestion', 'prompt'];
          const responseObj = responseData as Record<string, unknown>;

          for (const field of questionFields) {
            const fieldData = responseObj[field];
            const extractedField = extractLocalizedOrString(fieldData);
            if (extractedField && extractedField.length > 15) {
              storyQ = extractedField;
              hasStoryQ = true;
              break;
            }
          }

          // If we still don't have a question, look through all NON-TECHNICAL fields for text
          if (!hasStoryQ) {
            for (const [field, value] of Object.entries(responseObj)) {
              if (isTechnicalField(field)) continue;
              
              const extractedVal = extractLocalizedOrString(value);
              if (extractedVal && extractedVal.trim().length > 15) {
                storyQ = extractedVal;
                hasStoryQ = true;
                break;
              }
            }
          }
        }

        if (hasStoryQ) {
          storyQContext = `\nMAIN STORY QUESTION: "${storyQ}"\n`;
          break; // We found a story question, no need to check other keys
        }
      } catch (e) {
        debugError(`Error processing story question data from ${key}:`, e);
      }
    }
  }

  // Try alternate location if we still don't have a story question
  if (!hasStoryQ && activityResponses.storyQuestionData) {
    try {
      const data = activityResponses.storyQuestionData;
      const extracted = extractLocalizedOrString(data);
      if (extracted && extracted.length > 15) {
        storyQContext = `\nMAIN STORY QUESTION: "${extracted}"\n`;
      } else if (typeof data === 'object' && data !== null) {
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
          if (isTechnicalField(key)) continue;
          
          const extractedVal = extractLocalizedOrString(value);
          if (extractedVal && extractedVal.trim().length > 15) {
            storyQContext = `\nMAIN STORY QUESTION: "${extractedVal}"\n`;
            break;
          }
        }
      }
    } catch (e) {
      debugError("Error processing storyQuestionData:", e);
    }
  }

  return context + storyQContext;
}
