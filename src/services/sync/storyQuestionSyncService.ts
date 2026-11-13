import { getStoryQuestion, saveStoryQuestion } from '../storyQuestionService';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { setStorageItem } from '../utils/storageUtils';
import { canonicalStringify } from '@/utils/jsonUtils';
import { fetchActivityResponse } from '../supabaseSync/operations';
import { extractQuestionFromLegacyResponse } from '../supabaseSync/utils/legacyQuestionUtils';
import {
  findStoryQuestionInResponses,
  fetchFromPublicFormConfiguration,
  processExtractedQuestion
} from '../supabaseSync/utils/storyQuestionFetchUtils';
import {
  saveToPublicStoryQuestions,
  saveToPublicFormConfiguration,
  saveToActivityResponses,
  prepareQuestionForSaving
} from '../supabaseSync/utils/storyQuestionSaveUtils';
import { clearFormDataCache } from '@/services/cache/formDataCache';
import {
  clearActivityCache,
  clearProjectCachedResponses
} from '@/services/supabaseSync/operations/cache/responseCache';
import { markActivityCompleted } from '@/services/completionState/completionStateService';
import { debugLog, debugError, debugWarn } from '@/utils/debugLogger';
import { safeParseStoryQuestion } from '@/utils/formLocalization';

const DEFAULT_STORY_QUESTION = "Please share your story with us.";

const clearStoryQuestionSessionCaches = (projectId: string) => {
  clearActivityCache(projectId, 'collection', 'story-questions', 'story-questions');
  clearActivityCache(projectId, 'collection', 'public-form', 'story-question');
  clearActivityCache(projectId, 'collection', 'public-form', 'public-story-questions');
};

const syncStoryQuestionFromSupabase = async (
  projectId: string,
  localQuestion: string | Record<string, string>,
  forceRefresh = false
): Promise<string | Record<string, string>> => {
  if (!projectId) {
    return localQuestion;
  }

  try {
    if (forceRefresh) {
      try {
        clearStoryQuestionSessionCaches(projectId);
      } catch (cacheError) {
        debugError(`Error clearing cache during force refresh:`, cacheError);
      }
    }

    let extractedQuestion = await findStoryQuestionInResponses(projectId);

    if (!extractedQuestion) {
      extractedQuestion = await fetchFromPublicFormConfiguration(projectId);

      if (!extractedQuestion) {
        const responseData = await fetchActivityResponse(
          projectId,
          'collection',
          'story-questions',
          'story-questions',
          { question: localQuestion },
          'question',
          forceRefresh
        );

        if (responseData) {
          extractedQuestion = extractQuestionFromLegacyResponse(responseData);
        }
      }
    }

    return processExtractedQuestion(extractedQuestion, localQuestion);
  } catch (error) {
    debugError(`Error fetching story question from Supabase for project ${projectId}:`, error);
    const isLocalValid = typeof localQuestion === 'string'
      ? localQuestion.trim().length > 3
      : localQuestion && Object.keys(localQuestion).length > 0;

    return isLocalValid ? localQuestion : DEFAULT_STORY_QUESTION;
  }
};

const saveStoryQuestionToSupabase = async (
  projectId: string,
  question: string | Record<string, string>
): Promise<boolean> => {
  if (!projectId) {
    return false;
  }

  try {
    try {
      clearStoryQuestionSessionCaches(projectId);
    } catch (cacheError) {
      debugError(`Error clearing cache before save:`, cacheError);
    }

    const processedQuestion = prepareQuestionForSaving(question);
    if (!processedQuestion) return false;

    try {
      const consolidatedSaveSuccess = await saveToActivityResponses(projectId, processedQuestion);
      const directSaveSuccess = await saveToPublicStoryQuestions(projectId, processedQuestion);
      const publicFormSuccess = await saveToPublicFormConfiguration(projectId, processedQuestion);

      return consolidatedSaveSuccess || directSaveSuccess || publicFormSuccess;
    } catch (directError) {
      debugError(`STORY QUESTION SYNC: Error with direct save: ${directError}`);
      return await saveToPublicFormConfiguration(projectId, processedQuestion);
    }
  } catch (error) {
    debugError(`Error saving story question to Supabase for project ${projectId}:`, error);
    return false;
  }
};

/**
  * Gets a story question with Supabase integration
 */
export const getStoryQuestionWithSync = async (projectId?: string, forceRefresh = false): Promise<string | Record<string, string>> => {
  if (!projectId) {
    debugLog("No project ID provided, using local story question");
    return await getStoryQuestion() || "";
  }

  debugLog("Fetching story question for project ID:", projectId, "Force refresh:", forceRefresh);

  try {
    // Check for most recently saved timestamp in localStorage
    const localSaveTimestamp = localStorage.getItem(`${STORAGE_KEYS.STORY_QUESTION_SAVED(projectId)}_last_save`);

    // Always prioritize Supabase data for consistent experience
    const supabaseQuestion = await syncStoryQuestionFromSupabase(projectId, await getStoryQuestion(projectId) || "", forceRefresh);

    // If Supabase returned a valid question, use it
    const isSupabaseValid = typeof supabaseQuestion === 'string'
      ? supabaseQuestion.trim() !== ''
      : (supabaseQuestion && Object.keys(supabaseQuestion).length > 0);

    if (isSupabaseValid) {
      debugLog("Found story question in Supabase:", supabaseQuestion);

      // Check localStorage for newer saves than last response from Supabase
      const localContent = localStorage.getItem(STORAGE_KEYS.STORY_QUESTION_CONTENT(projectId));

      // Use canonical comparison to ignore property order or formatting differences
      const localCanonical = canonicalStringify(safeParseStoryQuestion(localContent));
      const supabaseCanonical = canonicalStringify(supabaseQuestion);
      
      const isContentActuallyDifferent = localCanonical !== supabaseCanonical;

      // CRITICAL: Protect against quality degradation (stale string overwriting fresh object)
      const isSupabaseBetterQuality = typeof supabaseQuestion === 'object' && typeof safeParseStoryQuestion(localContent) === 'string';
      
      if (localSaveTimestamp && localContent && localContent.trim() !== '' && isContentActuallyDifferent && !isSupabaseBetterQuality) {
        debugLog("STORY QUESTION SYNC: Local storage wins (more recent). Local:", localContent.substring(0, 50));

        const parsedLocal = safeParseStoryQuestion(localContent);

        // Sync the local question back to Supabase asynchronously
        try {
          saveStoryQuestionToSupabase(projectId, localContent)
            .catch(e => debugError("Error syncing local question to Supabase:", e));
        } catch (syncError) {
          debugError("Error during background sync of local question to Supabase:", syncError);
        }

        return parsedLocal;
      }

      // Otherwise use the Supabase question and update local storage
      saveStoryQuestion(supabaseQuestion, projectId);

      return supabaseQuestion;
    }

    // Check for locally saved content as a fallback
    const localContent = localStorage.getItem(STORAGE_KEYS.STORY_QUESTION_CONTENT(projectId));
    if (localContent && localContent.trim() !== '') {
      debugLog("Found locally saved story question:", localContent);

      const parsedLocal = safeParseStoryQuestion(localContent);

      // Sync to Supabase
      try {
        await saveStoryQuestionToSupabase(projectId, localContent);
      } catch (syncError) {
        debugError("Error syncing local question to Supabase:", syncError);
      }

      return parsedLocal;
    }

    // If nothing found in Supabase but we have a local question, synchronize it
    const localQuestion = await getStoryQuestion(projectId);
    if (localQuestion && typeof localQuestion === 'string' && localQuestion.trim() !== '') {
      debugLog("Syncing local story question to Supabase:", localQuestion);
      await saveStoryQuestionToSupabase(projectId, localQuestion);
      return localQuestion;
    }

    // If all else fails, return the local question (may be default)
    return await getStoryQuestion(projectId) || "";
  } catch (error) {
    debugError("Error fetching story question:", error);

    // Try localStorage as emergency fallback
    const localContent = localStorage.getItem(STORAGE_KEYS.STORY_QUESTION_CONTENT(projectId));
    if (localContent && localContent.trim() !== '') {
      debugLog("Using emergency localStorage fallback for story question:", localContent);
      return safeParseStoryQuestion(localContent);
    }

    return (await getStoryQuestion(projectId)) || "";
  }
};

/**
 * Saves a story question with Supabase integration
 */
export const saveStoryQuestionWithSync = async (projectId: string, question: string | Record<string, string>): Promise<boolean> => {
  if (!projectId) {
    debugWarn("No project ID provided for saveStoryQuestionWithSync");
    saveStoryQuestion(question);
    return false;
  }

  debugLog("Saving story question with sync. Project ID:", projectId, "Question:", question);

  // First clear any caches to ensure fresh data
  try {
    // Clear form cache
    clearFormDataCache(projectId, 'form_data');

    // Clear cache for all phases
    clearProjectCachedResponses(projectId);

    // Clear specific activity response caches
    clearActivityCache(projectId, 'collection', 'story-question', 'story-question');
    clearActivityCache(projectId, 'collection', 'public-form', 'story-question');
    clearActivityCache(projectId, 'collection', 'public-form', 'public-story-questions');

    // Force refresh by setting timestamp
    sessionStorage.setItem('story_question_last_save', Date.now().toString());
  } catch (error) {
    debugError("Error clearing cache during save:", error);
  }

  // Always save locally first with the specific project ID
  saveStoryQuestion(question, projectId);
  setStorageItem(STORAGE_KEYS.FORM_DESIGNED, 'true');

  // Update localStorage timestamp and content
  localStorage.setItem(`${STORAGE_KEYS.STORY_QUESTION_SAVED(projectId)}_last_save`, Date.now().toString());
  const contentToStore = typeof question === 'string' ? question : JSON.stringify(question);
  localStorage.setItem(STORAGE_KEYS.STORY_QUESTION_CONTENT(projectId), contentToStore);
  // Mark story question as explicitly saved for this project
  localStorage.setItem(STORAGE_KEYS.STORY_QUESTION_SAVED(projectId), 'true');

  try {
    // Then save to Supabase
    const success = await saveStoryQuestionToSupabase(projectId, question);
    debugLog("Saved story question to Supabase:", success);

    // Also save to public form configuration for immediate use
    try {
      const { saveStoryQuestion: savePublicStoryQuestion } = await import('@/services/publicForm/storyQuestionService');
      await savePublicStoryQuestion(projectId, question);
    } catch (publicSaveError) {
      debugError("Error saving to public form configuration:", publicSaveError);
    }

    // Mark completion state if the story question is valid (not empty, not default)
    const isValidQuestion = typeof question === 'string'
      ? (question.trim().length > 3 && question.trim() !== DEFAULT_STORY_QUESTION.trim())
      : (question && Object.keys(question).length > 0);

    if (success && isValidQuestion) {
      try {
        await markActivityCompleted({
          projectId,
          phase: 'collection',
          step: 'questions',
          activity: 'story-question'
        });
        debugLog("Marked story-questions completion state as complete");
      } catch (completionError) {
        debugError("Error marking story question as complete:", completionError);
      }
    }

    return success;
  } catch (error) {
    debugError("Error saving story question to Supabase:", error);
    return false;
  }
};
