
/**
 * Memory cache implementation
 */
import { memoryCache } from './cacheConfig';

/**
 * Get an item from memory cache
 */
export const getFromMemoryCache = <T>(
  key: string,
  defaultValue: T,
  expiration: number = -1
): T => {
  const item = memoryCache.get(key);
  if (item && (expiration === -1 || Date.now() - item.timestamp < expiration)) {
    return item.data as T;
  }
  return defaultValue;
};

/**
 * Set an item in memory cache
 */
export const setInMemoryCache = <T>(
  key: string,
  data: T
): void => {
  memoryCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

/**
 * Remove an item from memory cache
 */
export const removeFromMemoryCache = (key: string): void => {
  memoryCache.delete(key);
};

/**
 * Clear items from memory cache by pattern
 */
export const clearMemoryCacheByPattern = (pattern: string): void => {
  // Convert wildcard pattern to regex
  // If pattern doesn't end with *, treat it as a prefix match
  const patternToUse = pattern.endsWith('*') ? pattern : `${pattern}*`;
  const regexPattern = patternToUse
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
    .replace(/\*/g, '.*'); // Convert * to .*
  const regex = new RegExp(`^${regexPattern}$`);

  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
    }
  }
};

/**
 * Check if an item in memory cache is valid
 */
export const isMemoryCacheItemValid = (key: string, expiration: number): boolean => {
  const item = memoryCache.get(key);
  if (!item) return false;

  // Infinite TTL is always valid
  if (expiration === -1) return true;

  return Date.now() - item.timestamp < expiration;
};
