
/**
 * Cache configuration constants and common utilities
 */
import { debugWarn } from "@/utils/debugLogger";

// Constants for cache expiration
export const CACHE_EXPIRATION = {
  SHORT: 1 * 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 10 * 60 * 1000, // 10 minutes
  VERY_LONG: 30 * 60 * 1000, // 30 minutes
};

// Memory cache for when storage is unavailable
export const memoryCache = new Map<string, {
  data: unknown,
  timestamp: number
}>();

/**
 * Check if browser storage is available
 */
export const isStorageAvailable = (): boolean => {
  try {
    const testKey = "__storage_test__";
    sessionStorage.setItem(testKey, "test");
    sessionStorage.removeItem(testKey);
    return true;
  } catch (error) {
    debugWarn("Storage is not available:", error);
    return false;
  }
};

/**
 * Get the appropriate storage object based on the storage type
 */
export const getStorageObject = (
  storage: 'session' | 'local' | 'memory'
): Storage | null => {
  if (storage === 'memory' || !isStorageAvailable()) {
    return null; // Use memory cache instead
  }

  return storage === 'local' ? localStorage : sessionStorage;
};
