
/**
 * Centralized cache service for consistent data caching across the application
 */
import { CACHE_EXPIRATION, isStorageAvailable } from './cacheConfig';
import {
  getFromMemoryCache,
  setInMemoryCache,
  removeFromMemoryCache,
  clearMemoryCacheByPattern,
  isMemoryCacheItemValid
} from './memoryCache';
import {
  getFromBrowserStorage,
  setInBrowserStorage,
  removeFromBrowserStorage,
  clearBrowserStorageByPattern,
  isBrowserStorageItemValid
} from './browserStorage';
import { CacheOptions, CacheKeyOptions } from './types/cacheTypes';
import { debugWarn } from "@/utils/debugLogger";

// Re-export constants
export { CACHE_EXPIRATION };

/**
 * Generate a standardized cache key
 */
export const generateCacheKey = ({
  entity,
  id,
  subType,
  version = 'v1'
}: CacheKeyOptions): string => {
  const parts = [entity];

  if (subType) {
    parts.push(subType);
  }

  parts.push(id, version);

  return parts.join('_');
};

/**
 * Get an item from cache with TTL support
 */
export const getCachedItem = <T>(
  key: string,
  defaultValue: T = null as unknown as T,
  options: CacheOptions = {}
): T => {
  const { storage = 'session', ttl = CACHE_EXPIRATION.MEDIUM } = options;

  try {
    // For memory storage
    if (storage === 'memory' || !isStorageAvailable()) {
      return getFromMemoryCache<T>(key, defaultValue, ttl);
    }

    // For browser storage
    return getFromBrowserStorage<T>(key, defaultValue, storage, ttl);
  } catch (error) {
    debugWarn(`Error retrieving cached item for key ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Set an item in cache with TTL
 */
export const setCachedItem = <T>(
  key: string,
  data: T,
  options: CacheOptions = {}
): void => {
  const { storage = 'session' } = options;

  try {
    // For memory storage
    if (storage === 'memory' || !isStorageAvailable()) {
      setInMemoryCache(key, data);
      return;
    }

    // For browser storage
    setInBrowserStorage(key, data, storage);
  } catch (error) {
    debugWarn(`Error setting cached item for key ${key}:`, error);
    // Fall back to memory cache
    setInMemoryCache(key, data);
  }
};

/**
 * Remove an item from cache
 */
export const removeCachedItem = (
  key: string,
  options: CacheOptions = {}
): void => {
  const { storage = 'session' } = options;

  try {
    // For memory storage
    if (storage === 'memory' || !isStorageAvailable()) {
      removeFromMemoryCache(key);
      return;
    }

    // For browser storage
    removeFromBrowserStorage(key, storage);
  } catch (error) {
    debugWarn(`Error removing cached item for key ${key}:`, error);
  }
};

/**
 * Clear all cache items matching a pattern
 */
export const clearCacheByPattern = (
  pattern: string,
  options: CacheOptions = {}
): void => {
  const { storage = 'session' } = options;

  try {
    // For memory storage
    if (storage === 'memory' || !isStorageAvailable()) {
      clearMemoryCacheByPattern(pattern);
      return;
    }

    // For browser storage
    clearBrowserStorageByPattern(pattern, storage);
  } catch (error) {
    debugWarn(`Error clearing cache by pattern ${pattern}:`, error);
  }
};

/**
 * Check if an item exists in cache and is valid
 */
export const isCachedItemValid = (
  key: string,
  options: CacheOptions = {}
): boolean => {
  const { storage = 'session', ttl = CACHE_EXPIRATION.MEDIUM } = options;

  try {
    // For memory storage
    if (storage === 'memory' || !isStorageAvailable()) {
      return isMemoryCacheItemValid(key, ttl);
    }

    // For browser storage
    return isBrowserStorageItemValid(key, storage, ttl);
  } catch (error) {
    debugWarn(`Error checking validity of cached item for key ${key}:`, error);
    return false;
  }
};

/**
 * Utility functions for common cache operations
 */
export const cacheOperations = {
  form: {
    get: <T>(projectId: string, formType = 'default', options?: CacheOptions) => {
      const key = generateCacheKey({ entity: 'form' as const, id: projectId, subType: formType });
      return getCachedItem<T>(key, null as unknown as T, options);
    },
    set: <T>(projectId: string, formType: string, data: T, options?: CacheOptions) => {
      const key = generateCacheKey({ entity: 'form' as const, id: projectId, subType: formType });
      setCachedItem(key, data, options);
    }
  },
  project: {
    get: <T>(projectId: string, options?: CacheOptions) => {
      const key = generateCacheKey({ entity: 'project' as const, id: projectId });
      return getCachedItem<T>(key, null as unknown as T, options);
    },
    set: <T>(projectId: string, data: T, options?: CacheOptions) => {
      const key = generateCacheKey({ entity: 'project' as const, id: projectId });
      setCachedItem(key, data, options);
    }
  },
  activity: {
    get: <T>(projectId: string, activityId: string, options?: CacheOptions) => {
      const key = generateCacheKey({ entity: 'activity' as const, id: `${projectId}_${activityId}` });
      return getCachedItem<T>(key, null as unknown as T, options);
    },
    set: <T>(projectId: string, activityId: string, data: T, options?: CacheOptions) => {
      const key = generateCacheKey({ entity: 'activity' as const, id: `${projectId}_${activityId}` });
      setCachedItem(key, data, options);
    }
  }
};

// Add isValid method to the cache manager
export const isValid = (
  key: string,
  options: CacheOptions = {}
): boolean => {
  return isCachedItemValid(key, options);
};

