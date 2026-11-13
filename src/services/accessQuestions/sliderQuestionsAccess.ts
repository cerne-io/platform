
import { SliderQuestion } from '../types/designTypes';
import { getSliderQuestionsWithSync } from '../sync/sliderQuestionsSyncService';
import { debugLog, debugError } from "@/utils/debugLogger";

/**
 * Get all slider questions for a project
 * This utility can be used anywhere in the application to access slider questions
 *
 * @param projectId The project ID to get slider questions for
 * @returns Promise resolving to an array of SliderQuestion objects
 */
export const getProjectSliderQuestions = async (projectId: string): Promise<SliderQuestion[]> => {
  if (!projectId) {
    debugError("No project ID provided to getProjectSliderQuestions");
    return [];
  }

  try {
    debugLog(`Fetching all slider questions for project ${projectId}`);
    const questions = await getSliderQuestionsWithSync(projectId);

    if (!questions || questions.length === 0) {
      debugLog(`No slider questions found for project ${projectId}`);
      return [];
    }

    debugLog(`Retrieved ${questions.length} slider questions for project ${projectId}`);
    return questions;
  } catch (error) {
    debugError(`Error fetching slider questions for project ${projectId}:`, error);
    return [];
  }
};

/**
 * Get a specific slider question by ID
 *
 * @param projectId The project ID to get slider questions for
 * @param questionId The ID of the specific question to retrieve
 * @returns Promise resolving to the found SliderQuestion or null if not found
 */
export const getSliderQuestionById = async (
  projectId: string,
  questionId: number
): Promise<SliderQuestion | null> => {
  if (!projectId || !questionId) {
    debugError("Missing projectId or questionId in getSliderQuestionById");
    return null;
  }

  try {
    const questions = await getProjectSliderQuestions(projectId);
    return questions.find(q => q.id === questionId) || null;
  } catch (error) {
    debugError(`Error fetching slider question ${questionId} for project ${projectId}:`, error);
    return null;
  }
};

/**
 * Search for slider questions by text content
 * This allows for searching for questions containing specific text
 *
 * @param projectId The project ID to get slider questions for
 * @param searchText The text to search for in the question content
 * @returns Promise resolving to an array of matching SliderQuestion objects
 */
export const findSliderQuestionsByText = async (
  projectId: string,
  searchText: string
): Promise<SliderQuestion[]> => {
  if (!projectId || !searchText) {
    return [];
  }

  const lowerSearchText = searchText.toLowerCase();

  try {
    const questions = await getProjectSliderQuestions(projectId);

    return questions.filter(question =>
      question.question.toLowerCase().includes(lowerSearchText) ||
      question.theme.toLowerCase().includes(lowerSearchText) ||
      question.leftLabel.toLowerCase().includes(lowerSearchText) ||
      question.rightLabel.toLowerCase().includes(lowerSearchText)
    );
  } catch (error) {
    debugError(`Error searching slider questions for "${searchText}":`, error);
    return [];
  }
};

/**
 * Export type definition to make it easier to import elsewhere
 */
export type { SliderQuestion } from '../types/designTypes';
