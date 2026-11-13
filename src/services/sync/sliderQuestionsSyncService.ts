
import { fetchActivityResponse, saveActivityResponse, isAuthenticated } from '../supabaseSync/operations';
import { SliderQuestion } from '../types/designTypes';
import { getSliderQuestions, saveSliderQuestions } from '../sliderQuestionsService';
import {
  CANONICAL_SLIDER_LOCATION,
  PUBLIC_FORM_SLIDER_LOCATION,
  cleanSliderQuestion,
  migrateSliderQuestions
} from '../supabaseSync/migrations/sliderQuestionsMigration';
import { debugLog, debugError } from "@/utils/debugLogger";
import { STORAGE_KEYS } from "@/services/constants/storageKeys";

const fetchFromSupabase = async (
  projectId: string,
  localQuestions: SliderQuestion[],
  isTemplateProject: boolean = false
): Promise<SliderQuestion[]> => {
  if (!projectId) {
    return localQuestions.map(cleanSliderQuestion);
  }

  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return localQuestions.map(cleanSliderQuestion);
    }

    const migratedQuestions = await migrateSliderQuestions(projectId);
    if (migratedQuestions.length > 0) {
      return migratedQuestions;
    }

    const canonicalResponse = await fetchActivityResponse<unknown>(
      projectId,
      CANONICAL_SLIDER_LOCATION.phase,
      CANONICAL_SLIDER_LOCATION.step,
      CANONICAL_SLIDER_LOCATION.activity,
      null,
      'sliderQuestions',
      isTemplateProject
    );

    if (canonicalResponse && Array.isArray(canonicalResponse) && canonicalResponse.length > 0) {
      return (canonicalResponse as SliderQuestion[]).map(cleanSliderQuestion);
    }

    if (canonicalResponse && typeof canonicalResponse === 'object' && canonicalResponse !== null) {
      const responseObj = canonicalResponse as Record<string, unknown>;
      if (Array.isArray(responseObj.sliderQuestions) && responseObj.sliderQuestions.length > 0) {
        return (responseObj.sliderQuestions as SliderQuestion[]).map(cleanSliderQuestion);
      }
    }

    return localQuestions.map(cleanSliderQuestion);
  } catch (error) {
    debugLog("Error in fetchFromSupabase (slider):", error);
    return localQuestions.map(cleanSliderQuestion);
  }
};

const saveToSupabase = async (
  projectId: string,
  questions: SliderQuestion[]
): Promise<boolean> => {
  if (!projectId) {
    return false;
  }

  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return false;
    }

    const cleanedQuestions = questions.map(cleanSliderQuestion);

    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.SLIDER_THEMES_SAVED(projectId));
      localStorage.removeItem('sliderThemesSaved');

      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('slider') || key.includes('activity_responses')) {
          sessionStorage.removeItem(key);
        }
      });
    }

    const canonicalResult = await saveActivityResponse<{ sliderQuestions: SliderQuestion[] }>(
      projectId,
      CANONICAL_SLIDER_LOCATION.phase,
      CANONICAL_SLIDER_LOCATION.step,
      CANONICAL_SLIDER_LOCATION.activity,
      { sliderQuestions: cleanedQuestions }
    );

    const publicFormResult = await saveActivityResponse<{ sliderQuestions: SliderQuestion[] }>(
      projectId,
      PUBLIC_FORM_SLIDER_LOCATION.phase,
      PUBLIC_FORM_SLIDER_LOCATION.step,
      PUBLIC_FORM_SLIDER_LOCATION.activity,
      { sliderQuestions: cleanedQuestions }
    );

    if ((canonicalResult || publicFormResult) && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('slider_questions_updated', {
          detail: { projectId, timestamp: Date.now() }
        }));
      } catch (e) {
        debugError("Error dispatching events:", e);
      }
    }

    return canonicalResult || publicFormResult;
  } catch (error) {
    debugError("Error in saveToSupabase (slider):", error);
    return false;
  }
};

/**
 * Gets slider questions with Supabase integration
 */
export const getSliderQuestionsWithSync = async (
  projectId?: string,
  isTemplateProject: boolean = false
): Promise<SliderQuestion[]> => {
  const localQuestions = getSliderQuestions(projectId);

  if (!projectId) {
    debugLog("No project ID provided, using local slider questions");
    // Clean local questions before returning
    return localQuestions.map(cleanSliderQuestion);
  }

  debugLog("Fetching slider questions for project ID:", projectId, "isTemplate:", isTemplateProject);

  try {
    // Don't clear local storage flags for template projects
    if (!isTemplateProject) {
      // Clear any project-specific completion flags when loading a project
      localStorage.removeItem(STORAGE_KEYS.SLIDER_THEMES_SAVED(projectId));
      localStorage.removeItem('sliderThemesSaved');
    }

    // Always prioritize Supabase data for consistent experience, especially for public links
    const supabaseQuestions = await fetchFromSupabase(projectId, localQuestions, isTemplateProject);

    // If Supabase returned valid questions, use those
    if (supabaseQuestions && Array.isArray(supabaseQuestions) && supabaseQuestions.length > 0) {
      debugLog("Found slider questions in Supabase:", supabaseQuestions);

      // Already cleaned in the sync function, but clean again to be sure
      const cleanedQuestions = supabaseQuestions.map(cleanSliderQuestion);

      // Save to local storage to ensure consistency
      saveSliderQuestions(cleanedQuestions, projectId);

      // Set the saved flag only for project-specific data from Supabase
      localStorage.setItem(STORAGE_KEYS.SLIDER_THEMES_SAVED(projectId), 'true');
      // Don't set global flag - only project-specific

      return cleanedQuestions;
    }

    // If nothing found in Supabase but we have local questions, synchronize them
    if (localQuestions && localQuestions.length > 0) {
      // Clean local questions before syncing
      const cleanedLocalQuestions = localQuestions.map(cleanSliderQuestion);

      debugLog("Syncing local slider questions to Supabase:", cleanedLocalQuestions);
      await saveToSupabase(projectId, cleanedLocalQuestions);

      // Also set this as saved if we synced local questions
      localStorage.setItem(STORAGE_KEYS.SLIDER_THEMES_SAVED(projectId), 'true');
      // Don't set global flag for local syncs

      return cleanedLocalQuestions;
    }

    // If we reach here, no questions were found - clear project-specific flag
    localStorage.removeItem(STORAGE_KEYS.SLIDER_THEMES_SAVED(projectId));
    // Don't clear global flag, let other projects use it

    return localQuestions.map(cleanSliderQuestion);
  } catch (error) {
    debugError("Error fetching slider questions:", error);
    return localQuestions.map(cleanSliderQuestion);
  }
};

/**
 * Saves slider questions with Supabase integration
 */
export const saveSliderQuestionsWithSync = async (projectId: string, questions: SliderQuestion[]): Promise<boolean> => {
  debugLog("Saving slider questions with sync. Project ID:", projectId, "Questions:", questions);

  // Clean questions before saving - we use the utility function from the migration module
  const cleanedQuestions = questions.map(cleanSliderQuestion);

  // Always save locally first
  saveSliderQuestions(cleanedQuestions, projectId);

  try {
    // Then save to Supabase using our updated sync function
    const success = await saveToSupabase(projectId, cleanedQuestions);
    debugLog("Saved slider questions to Supabase:", success);

    if (success) {
      // Set the saved flag for this project
      localStorage.setItem(STORAGE_KEYS.SLIDER_THEMES_SAVED(projectId), 'true');
      // Don't set global flag automatically
    }

    return success;
  } catch (error) {
    debugError("Error saving slider questions to Supabase:", error);
    return false;
  }
};
