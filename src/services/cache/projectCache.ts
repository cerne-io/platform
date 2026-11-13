
import { 
  getCachedItem, 
  setCachedItem, 
  removeCachedItem, 
  clearCacheByPattern, 
  isCachedItemValid,
  CACHE_EXPIRATION 
} from './cacheService';

// Cache key for storing the last loaded project ID
const LAST_LOADED_PROJECT_KEY = 'last_loaded_project_id';

// Export cache keys for use elsewhere
export const PROJECT_CACHE_KEYS = {
  LAST_LOADED: LAST_LOADED_PROJECT_KEY
};

/**
 * Get the last loaded project ID from cache
 */
export const getLastLoadedProjectId = (): string | null => {
  return getCachedItem<string | null>(LAST_LOADED_PROJECT_KEY, null);
};

/**
 * Set the last loaded project ID in cache
 */
export const setLastLoadedProjectId = (projectId: string): void => {
  setCachedItem<string>(LAST_LOADED_PROJECT_KEY, projectId, {
    ttl: CACHE_EXPIRATION.LONG
  });
};

/**
 * Clear the last loaded project ID from cache
 */
export const clearLastLoadedProjectId = (): void => {
  removeCachedItem(LAST_LOADED_PROJECT_KEY);
};

/**
 * Check if a project has been loaded and cached
 */
export const isProjectCached = (projectId: string): boolean => {
  const key = `project_${projectId}_v1`;
  return isCachedItemValid(key, { ttl: CACHE_EXPIRATION.MEDIUM });
};

/**
 * Get project data from cache
 */
export const getProjectFromCache = <T>(projectId: string, defaultValue: T = null as unknown as T): T => {
  return getCachedItem<T>(`project_${projectId}_v1`, defaultValue);
};

/**
 * Store project data in cache
 */
export const setProjectInCache = <T>(projectId: string, data: T): void => {
  setCachedItem<T>(`project_${projectId}_v1`, data);
};

/**
 * Clear project data from cache
 */
export const clearProjectCache = (projectId: string): void => {
  removeCachedItem(`project_${projectId}_v1`);
};

/**
 * Clear all project-related caches
 */
export const clearAllProjectCaches = (): void => {
  clearCacheByPattern('project_*');
};
