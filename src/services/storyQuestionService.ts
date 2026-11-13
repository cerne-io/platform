
import { STORAGE_KEYS } from './constants/storageKeys';
import { getStorageItem, setStorageItem, markFormAsDesigned } from './utils/storageUtils';
import { supabase } from '@/integrations/supabase/client';
import { debugLog, debugError } from '@/utils/debugLogger';

// Default story question to use when nothing is saved and we explicitly need a fallback
export const DEFAULT_STORY_QUESTION = "";

// Synchronous version that only checks localStorage (for quick checks)
export const getStoryQuestionSync = (projectId?: string): string | Record<string, string> | null => {
  // First try to get project-specific question if a projectId is provided
  if (projectId) {
    const projectKey = `${STORAGE_KEYS.STORY_QUESTION}_${projectId}`;
    const projectSavedData = getStorageItem<{ question: string | Record<string, string> } | null>(projectKey, null);

    if (projectSavedData && projectSavedData.question) {
      return projectSavedData.question;
    }
  }

  // Fallback to global question
  const savedData = getStorageItem<{ question: string | Record<string, string> } | null>(STORAGE_KEYS.STORY_QUESTION, null);

  if (savedData && savedData.question) {
    return savedData.question;
  }

  return null;
};

// Async version that fetches from Supabase for templates, localStorage otherwise
export const getStoryQuestion = async (projectId?: string): Promise<string | Record<string, string> | null> => {
  // If no projectId, fall back to localStorage
  if (!projectId) {
    const savedData = getStorageItem<{ question: string | Record<string, string> } | null>(STORAGE_KEYS.STORY_QUESTION, null);
    if (savedData && savedData.question) {
      debugLog("Successfully retrieved global story question:", savedData.question);
      return savedData.question;
    }
    return null;
  }

  try {
    // First check if this project has a public form ID
    // If it does, it's not a template (public forms are only for regular projects)
    const { data: hasPublicForm, error: publicFormError } = await supabase
      .rpc('has_public_form_id', { project_id: projectId });

    let isTemplate = false;
    if (!publicFormError && hasPublicForm) {
      isTemplate = false; // Has public form = not a template
    } else {
      // If no public form, check the projects table
      const { data: projectData } = await supabase
        .from('projects')
        .select('is_template')
        .eq('id', projectId)
        .maybeSingle();

      isTemplate = projectData?.is_template || false;
    }

    // For templates, fetch from Supabase
    if (isTemplate) {
      debugLog('Fetching story question from Supabase for template:', projectId);

      const { data: templateData, error } = await supabase
        .rpc('fetch_template_activity_response', {
          project_id: projectId,
          phase_id: 'collection',
          step_id: 'story-questions',
          activity_id: 'story-questions'
        });

      if (error) {
        debugError('Error fetching template story question:', error);
      } else if (templateData) {
        const response = templateData as Record<string, unknown>;
        if (response?.found && (response.data as Record<string, unknown>)?.ar_response) {
          const arResponse = (response.data as Record<string, unknown>).ar_response;
          const question = typeof arResponse === 'string'
            ? arResponse
            : (arResponse as Record<string, unknown>).question as (string | Record<string, string>);

          debugLog('Found story question in Supabase:', question);
          return question || null;
        }
      }
    }

    // For non-templates or fallback, check localStorage
    const projectKey = `${STORAGE_KEYS.STORY_QUESTION}_${projectId}`;
    const projectSavedData = getStorageItem<{ question: string | Record<string, string> } | null>(projectKey, null);

    if (projectSavedData && projectSavedData.question) {
      debugLog(`Successfully retrieved story question for project ${projectId}:`, projectSavedData.question);
      return projectSavedData.question;
    }

    // Check if we've marked this project as having saved a question before
    const hasQuestionBeenSaved = localStorage.getItem(STORAGE_KEYS.STORY_QUESTION_SAVED(projectId));
    if (hasQuestionBeenSaved === 'true') {
      // If we've saved before but now have no question, return empty string
      return "";
    }

    debugLog("No story question found, returning null for new project");
    return null;
  } catch (error) {
    debugError('Error in getStoryQuestion:', error);
    return null;
  }
};

// Helper function to store the story question
export const saveStoryQuestion = (question: string | Record<string, string>, projectId?: string): void => {
  // Always save to the global key for backward compatibility
  setStorageItem(STORAGE_KEYS.STORY_QUESTION, { question });

  // If a projectId is provided, also save to a project-specific key
  if (projectId) {
    const projectKey = `${STORAGE_KEYS.STORY_QUESTION}_${projectId}`;
    setStorageItem(projectKey, { question });
  }

  // Use projectId if provided, otherwise use empty string
  markFormAsDesigned(projectId || '');

  // Set the saved flag for this project
  if (projectId) {
    localStorage.setItem(STORAGE_KEYS.STORY_QUESTION_SAVED(projectId), 'true');
  }

  debugLog("Saved story question:", question, "for project:", projectId || 'global');
};
