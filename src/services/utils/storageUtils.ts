
import { debugLog, debugError } from "@/utils/debugLogger";
import { STORAGE_KEYS } from "@/services/constants/storageKeys";

/**
 * Utility functions for working with browser storage
 */

/**
 * Check if a storage type (localStorage or sessionStorage) is available and writable
 */
export const isStorageAvailable = (type: 'localStorage' | 'sessionStorage' = 'localStorage'): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    const storage = window[type];
    if (!storage) return false;
    const testKey = '__cerne_storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get item from storage with default value fallback
 */
export const getStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    if (typeof window === 'undefined') return defaultValue;
    const item = localStorage.getItem(key);
    return item !== null ? JSON.parse(item) : defaultValue;
  } catch (error) {
    debugError(`Error retrieving ${key} from localStorage:`, error);
    return defaultValue;
  }
};

/**
 * Set item in storage with error and quota handling
 */
export const setStorageItem = <T>(key: string, value: T): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.code === 22 ||
        error.code === 1014 ||
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      debugError(`Storage quota exceeded when writing ${key} to localStorage:`, error);
    } else {
      debugError(`Error storing ${key} in localStorage:`, error);
    }
    return false;
  }
};

/**
 * Remove item from storage with error handling
 */
export const removeStorageItem = (key: string): void => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  } catch (error) {
    debugError(`Error removing ${key} from localStorage:`, error);
  }
};

/**
 * Mark a form as designed for a project
 * @param projectId The project ID to mark form design for (empty string for global)
 */
export const markFormAsDesigned = (projectId: string): void => {
  try {
    // Set global flag
    localStorage.setItem(STORAGE_KEYS.FORM_DESIGNED, 'true');

    // If a specific project ID is provided, also set project-specific flag
    if (projectId) {
      localStorage.setItem(STORAGE_KEYS.FORM_DESIGNED_PROJECT(projectId), 'true');
      debugLog(`Form marked as designed for project: ${projectId}`);
    } else {
      debugLog('Form marked as designed globally');
    }
  } catch (error) {
    debugError('Error marking form as designed:', error);
  }
};

/**
 * Check if a form has been explicitly designed for a specific project
 * @param projectId The project ID to check form design status for
 */
export const isFormDesignedForProject = (projectId: string): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEYS.FORM_DESIGNED_PROJECT(projectId)) === 'true';
  } catch (error) {
    debugError(`Error checking if form is designed for project ${projectId}:`, error);
    return false;
  }
};

/**
 * Clear all storage items related to a specific project
 * @param projectId The project ID to clear storage for
 */
export const clearProjectStorage = (projectId: string): void => {
  if (!projectId) {
    debugError("Cannot clear project storage: No project ID provided");
    return;
  }

  try {
    // Find all localStorage items that contain the project ID
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        key.includes(projectId) &&
        !key.startsWith('confetti-shown-') &&
        !key.startsWith('design-fork-choice-') &&
        !key.startsWith('semantic-assistant-') &&
        !key.startsWith('design-assistant-')
      ) {
        keysToRemove.push(key);
      }
    }

    // Remove all found keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      debugLog(`Removed storage item: ${key}`);
    });

    debugLog(`Cleared ${keysToRemove.length} storage items for project: ${projectId}`);
  } catch (error) {
    debugError(`Error clearing project storage for ${projectId}:`, error);
  }
};

/**
 * Helper to reliably obtain the active project ID synchronously from state or storage
 */
export const getEffectiveProjectId = (project?: { id?: string } | null): string | null => {
  if (project?.id) return project.id;
  try {
    const savedId = localStorage.getItem('activeProjectId') || sessionStorage.getItem('activeProjectId');
    if (savedId) return savedId;
    const savedProj = localStorage.getItem('activeProject');
    if (savedProj) return JSON.parse(savedProj)?.id || null;
  } catch {
    return null;
  }
  return null;
};

/**
 * Helper to get saved fork choice for a project
 */
export const getSavedForkChoice = (projectId: string | null): string | null => {
  if (!projectId) return null;
  return (
    localStorage.getItem(`design-fork-choice-${projectId}`) ||
    sessionStorage.getItem(`design-fork-choice-${projectId}`) ||
    null
  );
};

/**
 * Helper to check if fork was already dismissed/chosen for this project
 */
export const isForkDismissedForProject = (projectId: string | null): boolean => {
  if (!projectId) return false;
  if (localStorage.getItem(`design-fork-choice-${projectId}`)) return true;
  if (sessionStorage.getItem(`design-fork-choice-${projectId}`)) return true;
  return false;
};

/**
 * Helper to persist fork choice per project
 */
export const persistForkChoice = (projectId: string | null, stepId: string): void => {
  if (projectId) {
    localStorage.setItem(`design-fork-choice-${projectId}`, stepId);
    sessionStorage.setItem(`design-fork-choice-${projectId}`, stepId);
  }
};
