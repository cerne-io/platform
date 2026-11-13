/**
 * Cache health monitoring and diagnostics
 * Detects and cleans contaminated cache entries
 */

interface CacheHealthReport {
  totalEntries: number;
  validEntries: number;
  contaminatedEntries: number;
  contaminatedKeys: string[];
}

interface CachedEntry {
  projectId?: string;
  data?: unknown;
  timestamp?: number;
}

/**
 * Diagnose cache health for a specific project
 * Identifies entries that belong to other projects (contamination)
 */
export const diagnoseCacheHealth = (currentProjectId: string): CacheHealthReport => {
  const allKeys = Object.keys(sessionStorage).filter(k => k.startsWith('response_'));

  const contaminated: string[] = [];
  let valid = 0;

  allKeys.forEach(key => {
    try {
      const rawData = sessionStorage.getItem(key);
      if (!rawData) return;

      const data = JSON.parse(rawData) as CachedEntry;

      // Check if this entry has project validation metadata
      if (data.projectId) {
        if (data.projectId !== currentProjectId) {
          contaminated.push(key);
          debugLog(`🔍 Contaminated cache entry found: ${key} (belongs to ${data.projectId})`);
        } else {
          valid++;
        }
      }
    } catch (error) {
      debugLog(`Failed to parse cache entry ${key}:`, error);
    }
  });

  return {
    totalEntries: allKeys.length,
    validEntries: valid,
    contaminatedEntries: contaminated.length,
    contaminatedKeys: contaminated
  };
};

import { debugLog } from "@/utils/debugLogger";

/**
 * Clean contaminated cache entries for the current project
 * Removes all entries that don't belong to the current project
 */
export const cleanContaminatedCache = (currentProjectId: string): void => {
  const diagnosis = diagnoseCacheHealth(currentProjectId);

  if (diagnosis.contaminatedEntries === 0) {
    debugLog(`✅ Cache is clean - no contaminated entries found`);
    return;
  }

  diagnosis.contaminatedKeys.forEach(key => {
    sessionStorage.removeItem(key);
    debugLog(`🧹 Removed contaminated entry: ${key}`);
  });

  debugLog(`🧹 Cleaned ${diagnosis.contaminatedEntries} contaminated cache entries`);
};

/**
 * Get a summary of cache health
 * Useful for debugging and monitoring
 */
export const getCacheHealthSummary = (currentProjectId: string): string => {
  const diagnosis = diagnoseCacheHealth(currentProjectId);

  return `
Cache Health Summary for Project ${currentProjectId}:
- Total entries: ${diagnosis.totalEntries}
- Valid entries: ${diagnosis.validEntries}
- Contaminated entries: ${diagnosis.contaminatedEntries}
${diagnosis.contaminatedEntries > 0 ? `- Contaminated keys: ${diagnosis.contaminatedKeys.join(', ')}` : ''}
  `.trim();
};
