import { TriangleQuestion } from "@/services/types/designTypes";
import { fetchActivityResponse } from "@/services/supabaseSync/operations";
import { saveTriangleQuestions as saveDualLocationTriangleQuestions } from "@/services/publicForm/triangleQuestionsService";
import { debugError } from "@/utils/debugLogger";
import { STORAGE_KEYS } from "@/services/constants/storageKeys";

const getTriangleQuestionsFromSupabase = async (
  projectId: string
): Promise<TriangleQuestion[]> => {
  const response = await fetchActivityResponse<Record<string, unknown> | null>(
    projectId,
    "design",
    "questions",
    "triangle-questions",
    null
  );

  if (response && Array.isArray(response.triangleQuestions) && response.triangleQuestions.length > 0) {
    return response.triangleQuestions as TriangleQuestion[];
  }

  return [];
};



/**
 * Get triangle questions with sync to Supabase
 * Attempts to fetch from Supabase first, falls back to localStorage, then defaults
 */
export const getTriangleQuestionsWithSync = async (
  projectId?: string,
  _isTemplateProject: boolean = false
): Promise<TriangleQuestion[]> => {
  // Helper to patch legacy default values
  const patchQuestions = (questions: TriangleQuestion[]) => {
    return questions.map(q => {
      // If using old default (50, 50), update to new centroid (50, 66.67)
      if (q.defaultX === 50 && q.defaultY === 50) {
        return { ...q, defaultY: 66.67 };
      }
      return q;
    });
  };

  // Try Supabase first
  if (projectId) {
    try {
      const supabaseQuestions = await getTriangleQuestionsFromSupabase(
        projectId
      );

      if (supabaseQuestions && supabaseQuestions.length > 0) {
        const patchedQuestions = patchQuestions(supabaseQuestions);
        // Cache in localStorage
        const storageKey = STORAGE_KEYS.TRIANGLE_QUESTIONS(projectId);
        localStorage.setItem(storageKey, JSON.stringify(patchedQuestions));
        return patchedQuestions;
      }
    } catch (error) {
      debugError("Error fetching triangle questions from Supabase:", error);
    }
  }

  // Try localStorage
  if (projectId) {
    const storageKey = STORAGE_KEYS.TRIANGLE_QUESTIONS(projectId);
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return patchQuestions(parsed);
        }
      } catch (error) {
        debugError("Error parsing cached triangle questions:", error);
      }
    }
  }

  // Return empty array instead of defaults
  return [];
};

/**
 * Save triangle questions with sync to Supabase
 */
export const saveTriangleQuestionsWithSync = async (
  questions: TriangleQuestion[],
  projectId: string
): Promise<void> => {
  if (!projectId) {
    throw new Error("Project ID is required to save triangle questions");
  }

  // Save to Supabase (both canonical and public locations)
  await saveDualLocationTriangleQuestions(projectId, questions);

  // Update localStorage cache
  const storageKey = STORAGE_KEYS.TRIANGLE_QUESTIONS(projectId);
  localStorage.setItem(storageKey, JSON.stringify(questions));
  localStorage.setItem(STORAGE_KEYS.TRIANGLE_QUESTIONS_SAVED(projectId), 'true');
};
