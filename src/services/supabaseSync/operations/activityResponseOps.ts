
import { fetchActivityResponse } from './fetch/fetchActivityResponse';
import { saveActivityResponse } from './save/saveActivityResponse';
import { isAuthenticated } from '../core/authUtils';
import { debugError } from "@/utils/debugLogger";

/**
 * Generic function to sync data between Supabase and local storage
 */
export const syncFromSupabase = async <T>(
  projectId: string,
  phaseId: string,
  stepId: string,
  activityId: string,
  defaultValue: T,
  responseKey: string | null = null
): Promise<T> => {
  if (!projectId) {
    return defaultValue;
  }

  try {
    // Check if authenticated
    if (!(await isAuthenticated())) {
      return defaultValue;
    }

    return fetchActivityResponse<T>(
      projectId,
      phaseId,
      stepId,
      activityId,
      defaultValue,
      responseKey
    );
  } catch (error) {
    debugError(`Error syncing data for ${activityId}:`, error);
    return defaultValue;
  }
};

/**
 * Generic function to save data to Supabase
 */
export const saveToSupabase = async <T>(
  projectId: string,
  phaseId: string,
  stepId: string,
  activityId: string,
  data: T,
  responseKey: string | null = null
): Promise<boolean> => {
  if (!projectId) {
    return false;
  }

  try {
    // Check if authenticated
    if (!(await isAuthenticated())) {
      return false;
    }

    return saveActivityResponse<T>(
      projectId,
      phaseId,
      stepId,
      activityId,
      data,
      responseKey
    );
  } catch (error) {
    debugError(`Error saving data for ${activityId}:`, error);
    return false;
  }
};
