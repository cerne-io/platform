
/**
 * Specialized cache for project context data
 */
import { getCachedItem, setCachedItem, removeCachedItem, clearCacheByPattern, CACHE_EXPIRATION } from "./cacheService";
import { CACHE_ENTITIES } from './cacheKeyGenerator';
import { STORAGE_KEYS } from "@/services/constants/storageKeys";
import { debugLog } from "@/utils/debugLogger";

// Prefix for project context cache keys
const CONTEXT_CACHE_PREFIX = `${CACHE_ENTITIES.CONTEXT}_` as const;

// In-memory cache for formatted context
const formattedContextCache: Record<string, string> = {};

/**
 * Generate a consistent cache key for project context
 */
export const generateContextCacheKey = (projectId: string): string => {
  return `${CONTEXT_CACHE_PREFIX}${projectId}`;
};

/**
 * Get cached project context
 */
export const getCachedProjectContext = <T>(
  projectId: string,
  defaultValue: T
): T => {
  // Check in-memory cache first for formatted context
  if (typeof defaultValue === 'string' && formattedContextCache[projectId]) {
    return formattedContextCache[projectId] as unknown as T;
  }

  const cacheKey = generateContextCacheKey(projectId);
  return getCachedItem<T>(
    cacheKey,
    defaultValue,
    { storage: 'session', ttl: CACHE_EXPIRATION.LONG }
  );
};

/**
 * Store project context in cache
 */
export const setCachedProjectContext = <T>(
  projectId: string,
  data: T
): void => {
  // Store formatted context strings in memory to avoid storage limits
  if (typeof data === 'string') {
    formattedContextCache[projectId] = data as string;
    return;
  }

  const cacheKey = generateContextCacheKey(projectId);
  setCachedItem(cacheKey, data, { storage: 'session' });
};

/**
 * Clear project context from cache
 */
export const clearProjectContextCache = (projectId?: string): void => {
  if (projectId) {
    // Clear specific project
    delete formattedContextCache[projectId];
    const cacheKey = generateContextCacheKey(projectId);
    removeCachedItem(cacheKey, { storage: 'session' });

    // Also clear global design flags to prevent cross-project bleed-through
    debugLog("[ProjectContextCache] Clearing global design flags for project:", projectId);
    localStorage.removeItem(STORAGE_KEYS.STORY_QUESTION_SAVED());
    localStorage.removeItem(STORAGE_KEYS.FORM_DESIGNED);
  } else {
    // Clear all projects
    Object.keys(formattedContextCache).forEach(key => {
      delete formattedContextCache[key];
    });
    clearCacheByPattern(CONTEXT_CACHE_PREFIX, { storage: 'session' });
  }
};

/**
 * Retrieve or set cached formatted context
 */
export const getOrSetFormattedContextCache = async (
  projectId: string,
  builder: () => Promise<string>
): Promise<string> => {
  // If we have a cached value, use it
  if (formattedContextCache[projectId]) {
    return formattedContextCache[projectId];
  }

  // Otherwise, build and cache the context
  return builder().then(context => {
    formattedContextCache[projectId] = context;
    return context;
  });
};
