
/**
 * Utility to get formatted project context as a string
 */
import { fetchComprehensiveProjectContext } from './dataFetcher';
import { formatRawContextData } from './formatters/formatRawContextData';
import { clearProjectContextCache, getOrSetFormattedContextCache } from '@/services/cache/projectContextCache';
import { debugLog, debugError } from "@/utils/debugLogger";

/**
 * Get a formatted string representation of the entire project context
 * 
 * @param projectId Project ID to fetch context for
 * @param projectName Project name to include in the context
 * @param projectDescription Optional project description
 * @param forceRefresh Whether to force refresh the cache
 * @returns Promise with the formatted context string
 */
export const getFormattedProjectContext = async (
  projectId: string,
  projectName: string,
  projectDescription?: string,
  forceRefresh: boolean = false
): Promise<string> => {
  try {
    debugLog(`Getting formatted project context for project: ${projectId}${forceRefresh ? ' (forced refresh)' : ''}`);

    // Check if we have a force refresh flag in sessionStorage or passed as parameter
    const storageForceRefresh = sessionStorage.getItem(`refresh_context_${projectId}`) === 'true';
    const shouldRefresh = forceRefresh || storageForceRefresh;

    if (shouldRefresh) {
      // Clear the flag and the cache
      sessionStorage.removeItem(`refresh_context_${projectId}`);
      clearProjectContextCache(projectId);
      debugLog("Force refresh flag detected, clearing cached context");
    }

    // If forcing refresh, don't use cache
    if (forceRefresh) {
      // Fetch all activity responses for the project
      const rawContextData = await fetchComprehensiveProjectContext(projectId);

      // Log what was fetched to help with debugging
      debugLog(`Fetched activity responses for context. Keys: ${Object.keys(rawContextData).join(', ')}`);

      // If no data was found, log a warning but continue with what we have
      if (Object.keys(rawContextData).length === 0) {
        debugLog("WARNING: No activity responses found for this project. Context will be minimal.");
      }

      // Format the raw context data into readable text
      const formattedContext = formatRawContextData(rawContextData, {
        projectName,
        projectDescription: projectDescription || ""
      });

      // Log the length of the generated context
      debugLog(`Generated formatted context of length: ${formattedContext.length}`);
      return formattedContext;
    }

    // Use the cache utility to get or build the context
    return getOrSetFormattedContextCache(projectId, async () => {
      // Fetch all activity responses for the project
      const rawContextData = await fetchComprehensiveProjectContext(projectId);

      // Log what was fetched to help with debugging
      debugLog(`Fetched activity responses for context. Keys: ${Object.keys(rawContextData).join(', ')}`);

      // If no data was found, log a warning but continue with what we have
      if (Object.keys(rawContextData).length === 0) {
        debugLog("WARNING: No activity responses found for this project. Context will be minimal.");
      }

      // Format the raw context data into readable text
      const formattedContext = formatRawContextData(rawContextData, {
        projectName,
        projectDescription: projectDescription || ""
      });

      // Log the length of the generated context
      debugLog(`Generated formatted context of length: ${formattedContext.length}`);
      return formattedContext;
    });
  } catch (error) {
    debugError("Error generating formatted project context:", error);
    return `Error generating project context: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};
