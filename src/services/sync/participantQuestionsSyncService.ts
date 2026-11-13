
import { fetchActivityResponse, saveActivityResponse, isAuthenticated } from '../supabaseSync/operations';
import { ParticipantQuestion, ParticipantQuestionsData } from '../types/designTypes';
import { getParticipantQuestions, saveParticipantQuestions } from '../participantQuestionsService';
import { debugLog, debugError } from '@/utils/debugLogger';
import { STORAGE_KEYS } from "@/services/constants/storageKeys";

export const cleanParticipantQuestion = (q: ParticipantQuestion): ParticipantQuestion => {
  const qType = q.questionType || (q as unknown as { type?: string }).type;
  return {
    id: q.id,
    label: typeof q.label === 'string' ? q.label.trim() : "",
    questionType: qType === 'checkboxes' ? 'checkboxes' : 'multiple-choice',
    includePreferNotToSay: q.includePreferNotToSay !== undefined ? !!q.includePreferNotToSay : undefined,
    checked: q.checked !== undefined ? !!q.checked : false,
    translations: q.translations || {},
    choices: Array.isArray(q.choices)
      ? q.choices.map(c => ({
        id: c.id,
        label: typeof c.label === 'string' ? c.label.trim() : "",
        translations: c.translations || {}
      }))
      : []
  };
};

const syncParticipantQuestionsFromSupabase = async (
  projectId: string,
  localQuestions: ParticipantQuestion[]
): Promise<ParticipantQuestionsData> => {
  if (!projectId) {
    return { questions: localQuestions, includePreferNotToSay: true };
  }

  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return { questions: localQuestions, includePreferNotToSay: true };
    }

    const locations = [
      { phase: 'design', step: 'questions', activity: 'participant-questions', key: null },
      { phase: 'collection', step: 'questions', activity: 'participant-questions', key: null },
      { phase: 'collection', step: 'public-form', activity: 'participant-questions', key: null }
    ];

    for (const location of locations) {
      const supabaseResponse = await fetchActivityResponse<unknown>(
        projectId,
        location.phase,
        location.step,
        location.activity,
        null,
        location.key
      );

      let participantQuestions: ParticipantQuestion[] = [];
      let includePreferNotToSay = true;
      let foundValidData = false;

      if (supabaseResponse) {
        if (Array.isArray(supabaseResponse)) {
          participantQuestions = supabaseResponse as ParticipantQuestion[];
          foundValidData = true;
        } else if (typeof supabaseResponse === 'object' && supabaseResponse !== null) {
          const responseObj = supabaseResponse as Record<string, unknown>;
          if (Array.isArray(responseObj.participantQuestions)) {
            participantQuestions = responseObj.participantQuestions as ParticipantQuestion[];
            foundValidData = true;
            if (responseObj.includePreferNotToSay !== undefined) {
              includePreferNotToSay = Boolean(responseObj.includePreferNotToSay);
            }
          }
        }
      }

      if (foundValidData && Array.isArray(participantQuestions)) {
        return { questions: participantQuestions.map(cleanParticipantQuestion), includePreferNotToSay };
      }
    }

    return { questions: localQuestions, includePreferNotToSay: true };
  } catch (error) {
    debugError("Error in syncParticipantQuestionsFromSupabase:", error);
    return { questions: localQuestions, includePreferNotToSay: true };
  }
};

const saveParticipantQuestionsToSupabase = async (
  projectId: string,
  questions: ParticipantQuestion[],
  includePreferNotToSay: boolean = true
): Promise<boolean> => {
  if (!projectId) {
    debugLog("No project ID provided, not saving participant questions to Supabase");
    return false;
  }

  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return false;
    }

    const cleanedQuestions = questions.map(cleanParticipantQuestion);

    const primaryResult = await saveActivityResponse<{ participantQuestions: ParticipantQuestion[], includePreferNotToSay: boolean }>(
      projectId,
      'design',
      'questions',
      'participant-questions',
      { participantQuestions: cleanedQuestions, includePreferNotToSay },
      null
    );

    const alternateResult = await saveActivityResponse<ParticipantQuestion[]>(
      projectId,
      'collection',
      'questions',
      'participant-questions',
      cleanedQuestions,
      null
    );

    const compatResult = await saveActivityResponse<{ participantQuestions: ParticipantQuestion[], includePreferNotToSay: boolean }>(
      projectId,
      'collection',
      'public-form',
      'participant-questions',
      { participantQuestions: cleanedQuestions, includePreferNotToSay },
      null
    );

    return primaryResult || alternateResult || compatResult;
  } catch (error) {
    debugError("Error in saveParticipantQuestionsToSupabase:", error);
    return false;
  }
};

/**
 * Gets participant questions with Supabase integration
 */
export const getParticipantQuestionsWithSync = async (projectId?: string): Promise<ParticipantQuestionsData> => {
  // Get the local questions specific to this project
  const localQuestions = getParticipantQuestions(projectId);

  if (!projectId) {
    debugLog("No project ID provided, using local participant questions");
    return localQuestions;
  }

  debugLog("Fetching participant questions for project ID:", projectId);

  try {
    // Always try to get questions from Supabase first
    debugLog("Attempting to fetch participant questions from Supabase for project:", projectId);
    const supabaseQuestions = await syncParticipantQuestionsFromSupabase(projectId, localQuestions.questions);

    // If Supabase returned valid questions (or explicitly an empty array with a toggle configuration), use those
    if (supabaseQuestions) {
      // It's possible for questions to be an empty array if they selected no questions but toggled a setting
      if (supabaseQuestions.questions && Array.isArray(supabaseQuestions.questions)) {
        debugLog("Found participant questions in Supabase:", supabaseQuestions.questions);

        // Save to local storage to ensure consistency, with the project ID
        saveParticipantQuestions(supabaseQuestions.questions, projectId, supabaseQuestions.includePreferNotToSay);

        // Mark as saved for this project
        localStorage.setItem(STORAGE_KEYS.PARTICIPANT_QUESTIONS_SAVED(projectId), 'true');

        return supabaseQuestions;
      }
    }

    // If nothing found in Supabase but we have local questions, synchronize them
    if (localQuestions && localQuestions.questions && localQuestions.questions.length > 0) {
      debugLog("Syncing local participant questions to Supabase:", localQuestions.questions);
      await saveParticipantQuestionsToSupabase(projectId, localQuestions.questions, localQuestions.includePreferNotToSay);
      // Mark as saved for this project since we synced from local
      localStorage.setItem(STORAGE_KEYS.PARTICIPANT_QUESTIONS_SAVED(projectId), 'true');
      return localQuestions;
    } else {
      debugLog("No participant questions found in Supabase or locally");
    }

    return localQuestions;
  } catch (error) {
    debugError("Error fetching participant questions:", error);
    // Return local questions as fallback if there's an error
    return localQuestions;
  }
};

/**
 * Saves participant questions with Supabase integration
 */
export const saveParticipantQuestionsWithSync = async (projectId: string, questions: ParticipantQuestion[], includePreferNotToSay: boolean = true): Promise<boolean> => {
  debugLog("Saving participant questions with sync. Project ID:", projectId, "Questions:", questions);

  // Always save locally first, with the project ID
  saveParticipantQuestions(questions, projectId);

  try {
    // Then save to Supabase
    const success = await saveParticipantQuestionsToSupabase(projectId, questions, includePreferNotToSay);
    debugLog("Saved participant questions to Supabase:", success);

    if (success) {
      // Mark as saved for this project
      localStorage.setItem(STORAGE_KEYS.PARTICIPANT_QUESTIONS_SAVED(projectId), 'true');
    }

    return success;
  } catch (error) {
    debugError("Error saving participant questions to Supabase:", error);
    return false;
  }
};
