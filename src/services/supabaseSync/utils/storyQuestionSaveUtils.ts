import { processAIResponse } from '../storyQuestionSyncBase';
import { saveActivityResponse } from '../operations';
import { debugLog, debugWarn, debugError } from "@/utils/debugLogger";
import { safeParseStoryQuestion } from "@/utils/formLocalization";

/**
 * Prepare question for saving by cleaning and validating it
 */
export const prepareQuestionForSaving = (question: string | Record<string, string>): string | Record<string, string> | null => {
  if (!question) {
    return "";
  }

  // Defensively parse strings that might be JSON before deciding how to process
  const parsedQuestion = safeParseStoryQuestion(question);

  if (typeof parsedQuestion === 'string') {
    if (parsedQuestion.trim().length === 0) return "";
    // Process the question to ensure it's clean and valid
    const processedQuestion = processAIResponse(parsedQuestion);
    if (!processedQuestion || processedQuestion.trim().length === 0) {
      debugWarn(`Cannot save empty question: "${parsedQuestion}" processed to "${processedQuestion}"`);
      return "";
    }
    return processedQuestion;
  }

  // If it's an object, it's already a translation record, return as is
  return parsedQuestion;
};

/**
 * Saves a story question directly to public-story-questions activity
 */
export const saveToPublicStoryQuestions = async (
  projectId: string,
  question: string | Record<string, string>
): Promise<boolean> => {
  debugLog(`Saving to public-story-questions for project ${projectId}`);

  try {
    const success = await saveActivityResponse(
      projectId,
      'collection',
      'public-form',
      'public-story-questions',
      { question }
    );

    return success;
  } catch (error) {
    debugError(`Error saving to public-story-questions: ${error}`);
    return false;
  }
};

/**
 * Saves a story question to the public form configuration
 */
export const saveToPublicFormConfiguration = async (
  projectId: string,
  question: string | Record<string, string>
): Promise<boolean> => {
  debugLog(`Saving to public form configuration for project ${projectId}`);

  try {
    const success = await saveActivityResponse(
      projectId,
      'collection',
      'public-form',
      'story-question',
      { storyQuestion: question }
    );

    return success;
  } catch (error) {
    debugError(`Error saving to public form configuration: ${error}`);
    return false;
  }
};

/**
 * Saves a story question to the consolidated activity_responses
 */
export const saveToActivityResponses = async (
  projectId: string,
  question: string | Record<string, string>
): Promise<boolean> => {
  debugLog(`Saving to consolidated activity_responses for project ${projectId}`);

  try {
    const success = await saveActivityResponse(
      projectId,
      'collection',
      'story-questions',
      'story-questions',
      {
        question,
        selected_at: new Date().toISOString()
      }
    );

    return success;
  } catch (error) {
    debugError(`Error saving to activity_responses: ${error}`);
    return false;
  }
};
