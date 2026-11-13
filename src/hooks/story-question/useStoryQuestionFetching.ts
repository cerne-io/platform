import { useEffect } from "react";
import { getStoryQuestionWithSync } from "@/services/sync/storyQuestionSyncService";
import { processAIResponse } from "@/components/design/improver/questionUtils";
import { clearFormDataCache } from "@/services/cache/formDataCache";
import { clearActivityCache } from "@/services/supabaseSync/operations/cache/responseCache";
import { handleError } from "@/utils/errorHandling";
import { debugLog, debugError } from "@/utils/debugLogger";
import { STORAGE_KEYS } from "@/services/constants/storageKeys";

interface StoryQuestionFetchingProps {
  projectId: string;
  setSavedQuestion: (question: string | Record<string, string> | null) => void;
  setCurrentQuestion: (question: string | Record<string, string> | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setHasEverSavedQuestion: (hasEverSaved: boolean) => void;
  setError: (error: string | null) => void;
}

export const useStoryQuestionFetching = ({
  projectId,
  setSavedQuestion,
  setCurrentQuestion,
  setIsLoading,
  setHasEverSavedQuestion,
  setError
}: StoryQuestionFetchingProps) => {
  // Load saved question if it exists or if project changes
  useEffect(() => {
    if (!projectId) return;

    // Store previous project ID for comparison
    const previousProjectId = localStorage.getItem('story_question_last_project_id');

    // Clear cached questions and reset state if switching to a different project
    if (previousProjectId && previousProjectId !== projectId) {
      debugLog(`Project changed from ${previousProjectId} to ${projectId}, clearing story question cache`);

      // Reset state to ensure blank start
      setSavedQuestion(null);
      setCurrentQuestion(null);
      setHasEverSavedQuestion(false);
      setError(null);

      // Clear all potential storage locations of story question
      try {
        localStorage.removeItem(STORAGE_KEYS.STORY_QUESTION_SAVED(previousProjectId));
        localStorage.removeItem(`${STORAGE_KEYS.STORY_QUESTION}_${previousProjectId}`);
        localStorage.removeItem(`${projectId}_story_question_saved`);

        // Clear AI response for the previous project
        localStorage.removeItem(`ai_story_question_response_${previousProjectId}`);
        localStorage.removeItem(`ai_story_question_response_timestamp_${previousProjectId}`);
      } catch (e) {
        debugError("Error clearing local storage:", e);
      }
    }

    // Update the last project ID
    localStorage.setItem('story_question_last_project_id', projectId);

    const fetchSavedQuestion = async () => {
      setIsLoading(true);
      setError(null);

      // Clear any existing caches for this specific data
      try {
        clearFormDataCache(projectId, 'form_data');

        // Clear all potential storage locations of story question with consolidated ID
        clearActivityCache(projectId, 'collection', 'story-questions', 'story-questions');
        clearActivityCache(projectId, 'collection', 'public-form', 'public-story-questions');
        clearActivityCache(projectId, 'design', 'story-questions', 'story-questions');
      } catch (cacheError) {
        debugError("Error clearing cache before fetching story question:", cacheError);
      }

      try {
        debugLog(`useStoryQuestion: Fetching question for project ${projectId} with force refresh`);

        // Always fetch with force refresh to ensure we get the latest data
        const forceRefresh = true;

        // Always fetch question for the specific project ID
        const question = await getStoryQuestionWithSync(projectId, forceRefresh);

        debugLog(`useStoryQuestion: Retrieved question:`, question);

        // Process the question to ensure it's valid
        // If it's an object, we trust its structure for now
        let processedQuestion: string | Record<string, string> = "";
        let isValid = false;

        if (typeof question === 'string') {
          processedQuestion = processAIResponse(question);
          isValid = processedQuestion.trim().length > 3;
        } else if (question && typeof question === 'object') {
          processedQuestion = question;
          isValid = Object.keys(question).length > 0;
        }
 
        // Only use the question if it's valid after processing
        if (isValid) {
          debugLog(`useStoryQuestion: Using valid question:`, processedQuestion);
          setSavedQuestion(processedQuestion);
          setCurrentQuestion(processedQuestion);
          setHasEverSavedQuestion(true);
 
          // Mark this project as having a saved question
          try {
            localStorage.setItem(STORAGE_KEYS.STORY_QUESTION_SAVED(projectId), 'true');
            // Also store the question itself in localStorage as a backup
            const contentToStore = typeof processedQuestion === 'string' ? processedQuestion : JSON.stringify(processedQuestion);
            localStorage.setItem(STORAGE_KEYS.STORY_QUESTION_CONTENT(projectId), contentToStore);
          } catch (storageError) {
            handleError(storageError, `Storage error when saving question flag for project ${projectId}`, {
              showToast: false,
              severity: 'warning'
            });
          }
        } else {
          // Check if we've saved a question before according to localStorage
          const hasQuestionBeenSaved = localStorage.getItem(STORAGE_KEYS.STORY_QUESTION_SAVED(projectId));
          if (hasQuestionBeenSaved === 'true') {
            const localStorageContent = localStorage.getItem(STORAGE_KEYS.STORY_QUESTION_CONTENT(projectId));

            if (localStorageContent && localStorageContent.trim().length > 3) {
              debugLog(`useStoryQuestion: Using question from localStorage:`, localStorageContent);
              
              let parsedQuestion: string | Record<string, string> = localStorageContent;
              if (localStorageContent.startsWith('{')) {
                try {
                  parsedQuestion = JSON.parse(localStorageContent);
                } catch (e) {
                  debugError("Error parsing story question from localStorage:", e);
                }
              }
              
              setSavedQuestion(parsedQuestion);
              setCurrentQuestion(parsedQuestion);
              setHasEverSavedQuestion(true);
            } else {
              // For projects with a saved flag but invalid question, 
              // we'll keep the state as saved but with empty question
              debugLog(`useStoryQuestion: Project has saved flag but invalid question`);
              setSavedQuestion(null);
              setCurrentQuestion(null);
              setHasEverSavedQuestion(true);
            }
          } else {
            // If we don't have a valid question and no saved status, show generate button
            debugLog(`useStoryQuestion: No valid question found for new project, showing generate button`);
            setSavedQuestion(null);
            setCurrentQuestion(null);
            setHasEverSavedQuestion(false);
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error loading saved question";
        setError(errorMessage);
        handleError(error, `Error loading saved question for project ${projectId}`, {
          context: { projectId },
          showToast: false // Don't show toast for fetch errors on initial load
        });

        // For new projects, always show the generate button
        setSavedQuestion(null);
        setCurrentQuestion(null);
        setHasEverSavedQuestion(false);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSavedQuestion();
  }, [projectId, setSavedQuestion, setCurrentQuestion, setIsLoading, setHasEverSavedQuestion, setError]);

  // Listen for story question saved events to trigger a refresh
  useEffect(() => {
    if (!projectId) return;

    const handleQuestionSavedEvent = (event: CustomEvent) => {
      // Only handle events for this project
      if (event.detail?.projectId === projectId) {
        const question = event.detail?.question;

        debugLog(`useStoryQuestionFetching: Received story_question_saved event with question:`, question);

        if (question) {
          // Update state with the new question
          setSavedQuestion(question);
          setCurrentQuestion(question);
          setHasEverSavedQuestion(true);

          // Update localStorage
          localStorage.setItem(STORAGE_KEYS.STORY_QUESTION_SAVED(projectId), 'true');
          const contentToStore = typeof question === 'string' ? question : JSON.stringify(question);
          localStorage.setItem(STORAGE_KEYS.STORY_QUESTION_CONTENT(projectId), contentToStore);
        }
      }
    };

    // Listen for story_question_saved events
    window.addEventListener('story_question_saved', handleQuestionSavedEvent as EventListener);

    return () => {
      window.removeEventListener('story_question_saved', handleQuestionSavedEvent as EventListener);
    };
  }, [projectId, setSavedQuestion, setCurrentQuestion, setHasEverSavedQuestion]);
};
