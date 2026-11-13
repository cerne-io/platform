import { 
  getCachedItem, 
  setCachedItem, 
  removeCachedItem, 
  clearCacheByPattern, 
  isCachedItemValid,
  CACHE_EXPIRATION 
} from './cacheService';
import { CacheOptions } from './types/cacheTypes';
import { debugLog } from '@/utils/debugLogger';

/**
 * Generates a cache key for form data
 */
export const generateFormCacheKey = (projectId: string, formType = 'default'): string => {
  return `form_${projectId}_${formType}_v1`;
};

/**
 * Get form data from cache
 */
export const getFormDataFromCache = <T>(
  projectId: string,
  formType = 'default',
  defaultValue: T = null as unknown as T,
  options: CacheOptions = {}
): T => {
  const key = generateFormCacheKey(projectId, formType);
  debugLog(`📂 [FormCache] Getting data from cache with key: ${key}`);
  const result = getCachedItem<T>(key, defaultValue, options);
  debugLog(`📂 [FormCache] Cache ${result === defaultValue ? 'MISS' : 'HIT'} for key: ${key}`);
  return result;
};

/**
 * Store form data in cache
 */
export const setFormDataInCache = <T>(
  projectId: string,
  formType = 'default',
  data: T,
  options: CacheOptions = {}
): void => {
  const key = generateFormCacheKey(projectId, formType);
  debugLog(`💾 [FormCache] Saving data to cache with key: ${key}`);
  setCachedItem<T>(key, data, options);
};

/**
 * Clear form data cache
 */
export const clearFormDataCache = (
  projectId: string,
  formType = 'default',
  options: CacheOptions = {}
): void => {
  const key = generateFormCacheKey(projectId, formType);
  debugLog(`🗑️ [FormCache] Clearing cache with key: ${key}`);
  removeCachedItem(key, options);
};

/**
 * Clear all form caches for a specific project
 */
export const clearAllFormCachesForProject = (
  projectId: string,
  options: CacheOptions = {}
): void => {
  debugLog(`🗑️ [FormCache] Clearing all form caches for project: ${projectId}`);
  clearCacheByPattern(`form_${projectId}_*`, options);
};

/**
 * Check if form data should be loaded from remote
 */
export const shouldLoadFromRemote = (cacheKey: string): boolean => {
  const parts = cacheKey.split('_');
  if (parts.length >= 3) {
    const isCached = isCachedItemValid(cacheKey, {
      ttl: CACHE_EXPIRATION.MEDIUM
    });
    debugLog(`🔄 [FormCache] Should load from remote for key ${cacheKey}: ${!isCached ? 'YES' : 'NO'}`);
    return !isCached;
  }
  return true;
};

// Export default object for backward compatibility
export default {
  getFormDataFromCache,
  setFormDataInCache,
  clearFormDataCache,
  clearAllFormCachesForProject,
  shouldLoadFromRemote,
  generateFormCacheKey
};
