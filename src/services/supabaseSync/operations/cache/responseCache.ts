
// Import from our centralized cache service
import {
  generateCacheKey,
  getCachedResponse,
  setCachedResponse,
  clearCachedResponse,
  clearAllCachedResponses,
  clearProjectCachedResponses
} from "@/services/cache/activityResponseCache";
import { debugLog, debugError } from "@/utils/debugLogger";

// Clear cache for a specific activity
export const clearActivityCache = (
  projectId: string,
  phaseId: string,
  stepId: string,
  activityId: string
): void => {
  try {
    const cacheKey = generateCacheKey(projectId, phaseId, stepId, activityId);

    // Clear from sessionStorage
    sessionStorage.removeItem(`ar_cache_${cacheKey}`);

    // Also clear from the central cache service
    clearCachedResponse(cacheKey);

    debugLog(`Cleared activity cache for key: ${cacheKey}`);
  } catch (error) {
    debugError(`Error clearing activity cache:`, error);
  }
};

/**
 * Cache response with both original and normalized keys
 */
export const cacheActivityResponse = <T>(
  projectId: string,
  phaseId: string,
  stepId: string,
  activityId: string,
  response: T,
  normalizedPhaseId?: string
): void => {
  const originalCacheKey = generateCacheKey(projectId, phaseId, stepId, activityId);
  setCachedResponse(originalCacheKey, response, projectId, phaseId, stepId, activityId);

  // If normalized phase ID is provided and different, cache with that key too
  if (normalizedPhaseId && phaseId !== normalizedPhaseId) {
    const normalizedCacheKey = generateCacheKey(projectId, normalizedPhaseId, stepId, activityId);
    setCachedResponse(normalizedCacheKey, response, projectId, normalizedPhaseId, stepId, activityId);
  }
};

// Re-export everything from the centralized service
export {
  generateCacheKey,
  getCachedResponse,
  setCachedResponse,
  clearCachedResponse,
  clearAllCachedResponses,
  clearProjectCachedResponses
};

// Cache configuration (for backward compatibility)
const CACHE_EXPIRATION = 10 * 60 * 1000; // 10 minutes cache expiration
export { CACHE_EXPIRATION };
