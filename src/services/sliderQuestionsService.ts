
import { STORAGE_KEYS } from './constants/storageKeys';
import { SliderQuestion } from './types/designTypes';
import { getStorageItem, setStorageItem, markFormAsDesigned } from './utils/storageUtils';
import { debugLog } from '@/utils/debugLogger';

// Get the slider questions - always returns an array of slider questions
export const getSliderQuestions = (projectId?: string): SliderQuestion[] => {
  // Get the appropriate storage key
  const storageKey = typeof STORAGE_KEYS.SLIDER_THEMES === 'function'
    ? STORAGE_KEYS.SLIDER_THEMES(projectId)
    : STORAGE_KEYS.SLIDER_THEMES;

  // First check the current storage location
  const savedThemes = getStorageItem<SliderQuestion[] | null>(storageKey, null);



  // Validate the data we got
  if (!savedThemes || !Array.isArray(savedThemes) || savedThemes.length === 0) {
    debugLog("Invalid or empty slider themes, returning empty array");
    return [];
  }

  debugLog("Retrieved slider questions:", savedThemes);
  return savedThemes;
};

// Helper function to save slider questions
export const saveSliderQuestions = (questions: SliderQuestion[], projectId?: string): void => {
  const storageKey = typeof STORAGE_KEYS.SLIDER_THEMES === 'function'
    ? STORAGE_KEYS.SLIDER_THEMES(projectId)
    : STORAGE_KEYS.SLIDER_THEMES;

  setStorageItem(storageKey, questions);



  // Use projectId if provided, otherwise use empty string
  markFormAsDesigned(projectId || '');

  debugLog("Saved slider questions:", questions, "for project:", projectId || 'global');
};
