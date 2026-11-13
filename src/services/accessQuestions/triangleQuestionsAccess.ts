
import { TriangleQuestion } from '../types/designTypes';
import { getTriangleQuestionsWithSync } from '../sync/triangleQuestionsSyncService';
import { debugLog, debugError } from "@/utils/debugLogger";

/**
 * Get all triangle questions for a project
 * This utility can be used anywhere in the application to access triangle questions
 *
 * @param projectId The project ID to get triangle questions for
 * @returns Promise resolving to an array of TriangleQuestion objects
 */
export const getProjectTriangleQuestions = async (projectId: string): Promise<TriangleQuestion[]> => {
    if (!projectId) {
        debugError("No project ID provided to getProjectTriangleQuestions");
        return [];
    }

    try {
        debugLog(`Fetching all triangle questions for project ${projectId}`);
        const questions = await getTriangleQuestionsWithSync(projectId);

        if (!questions || questions.length === 0) {
            debugLog(`No triangle questions found for project ${projectId}`);
            return [];
        }

        debugLog(`Retrieved ${questions.length} triangle questions for project ${projectId}`);
        return questions;
    } catch (error) {
        debugError(`Error fetching triangle questions for project ${projectId}:`, error);
        return [];
    }
};

/**
 * Get a specific triangle question by ID
 *
 * @param projectId The project ID to get triangle questions for
 * @param questionId The ID of the specific question to retrieve
 * @returns Promise resolving to the found TriangleQuestion or null if not found
 */
export const getTriangleQuestionById = async (
    projectId: string,
    questionId: number
): Promise<TriangleQuestion | null> => {
    if (!projectId || !questionId) {
        debugError("Missing projectId or questionId in getTriangleQuestionById");
        return null;
    }

    try {
        const questions = await getProjectTriangleQuestions(projectId);
        return questions.find(q => q.id === questionId) || null;
    } catch (error) {
        debugError(`Error fetching triangle question ${questionId} for project ${projectId}:`, error);
        return null;
    }
};

/**
 * Export type definition to make it easier to import elsewhere
 */
export type { TriangleQuestion } from '../types/designTypes';
