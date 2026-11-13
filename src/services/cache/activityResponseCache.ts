
import { 
  getCachedItem, 
  setCachedItem, 
  removeCachedItem, 
  clearCacheByPattern,
  CACHE_EXPIRATION 
} from './cacheService';
import { CacheOptions } from './types/cacheTypes';
import { debugLog, debugError } from "@/utils/debugLogger";

/**
 * Wrapper interface for cached activity responses with validation metadata
 */
interface CachedActivityResponse<T> {
  projectId: string;
  phaseId: string;
  stepId: string;
  activityId: string;
  data: T;
  timestamp: number;
}

/**
 * Generate standardized cache key for activity responses
 */
export const generateCacheKey = (
  projectId: string,
  phaseId: string,
  stepId: string,
  activityId: string
): string => {
  return `response_${projectId}_${phaseId}_${stepId}_${activityId}`;
};

/**
 * Get cached response data with project ID validation
 */
export const getCachedResponse = <T>(
  cacheKey: string,
  currentProjectId: string,
  responseKey: string | null = null,
  options: CacheOptions = { ttl: CACHE_EXPIRATION.MEDIUM }
): T | null => {
  try {
    const wrappedData = getCachedItem<CachedActivityResponse<T>>(
      cacheKey,
      null as unknown as CachedActivityResponse<T>,
      options
    );

    if (!wrappedData) {
      return null;
    }

    // 🛡️ VALIDATION: Check if cached data belongs to current project
    if (wrappedData.projectId && wrappedData.projectId !== currentProjectId) {
      debugLog(
        `⚠️ Cache contamination detected! ` +
        `Cached data for project ${wrappedData.projectId} ` +
        `accessed from project ${currentProjectId}. Clearing invalid cache.`
      );
      clearCachedResponse(cacheKey, options);
      return null;
    }

    // Extract the actual data
    const cachedData = wrappedData.data;

    // Extract specific key if requested
    if (responseKey && typeof cachedData === 'object' && cachedData !== null && responseKey in (cachedData as object)) {
      return (cachedData as Record<string, unknown>)[responseKey] as unknown as T;
    }

    return cachedData;
  } catch (error) {
    debugError(`Error retrieving cached response for key ${cacheKey}:`, error);
    return null;
  }
};

/**
 * Set response data in cache with validation metadata
 */
export const setCachedResponse = <T>(
  cacheKey: string,
  data: T,
  projectId: string,
  phaseId: string,
  stepId: string,
  activityId: string,
  options: CacheOptions = { ttl: CACHE_EXPIRATION.MEDIUM }
): void => {
  try {
    const wrappedData: CachedActivityResponse<T> = {
      projectId,
      phaseId,
      stepId,
      activityId,
      data,
      timestamp: Date.now()
    };
    setCachedItem(cacheKey, wrappedData, options);
  } catch (error) {
    debugError(`Error caching response for key ${cacheKey}:`, error);
  }
};

/**
 * Clear cached response
 */
export const clearCachedResponse = (
  cacheKey: string,
  options: CacheOptions = {}
): void => {
  try {
    removeCachedItem(cacheKey, options);
  } catch (error) {
    debugError(`Error clearing cached response for key ${cacheKey}:`, error);
  }
};

/**
 * Clear all cached responses
 */
export const clearAllCachedResponses = (options: CacheOptions = {}): void => {
  try {
    clearCacheByPattern('response_*', options);
  } catch (error) {
    debugError('Error clearing all cached responses:', error);
  }
};

/**
 * Clear all cached responses for a specific project
 */
export const clearProjectCachedResponses = (
  projectId: string,
  options: CacheOptions = {}
): void => {
  try {
    clearCacheByPattern(`response_${projectId}_*`, options);
  } catch (error) {
    debugError(`Error clearing cached responses for project ${projectId}:`, error);
  }
};

/**
 * Clear cache for a specific activity
 */
export const clearActivityCache = (
  projectId: string,
  phaseId: string,
  stepId: string,
  activityId: string
): void => {
  try {
    const cacheKey = generateCacheKey(projectId, phaseId, stepId, activityId);
    clearCachedResponse(cacheKey);
    debugLog(`Cleared activity cache for key: ${cacheKey}`);
  } catch (error) {
    debugError(`Error clearing activity cache:`, error);
  }
};

// Export cache expiration constant for backward compatibility
export { CACHE_EXPIRATION };
