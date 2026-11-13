
/**
 * Functions for fetching project context data
 */

import { fetchActivityResponse } from "@/services/supabaseSync/operations";
import { debugLog, debugError, debugWarn } from "@/utils/debugLogger";

/**
 * Fetch comprehensive project context data for AI generation
 */
export const fetchComprehensiveProjectContext = async (projectId: string): Promise<Record<string, unknown>> => {
  debugLog("Fetching comprehensive project context data for AI generation for project:", projectId);

  try {
    // Create an array of promises for parallel fetching of all relevant project data
    const fetchPromises = [
      // Context phase - project description
      { key: 'projectDescription', promise: fetchActivityResponse<unknown>(projectId, 'context', 'project-info', 'project-description', null) },

      // Context phase - organization context
      { key: 'organizationAbout', promise: fetchActivityResponse<unknown>(projectId, 'context', 'organization', 'about', null) },
      { key: 'organizationHistory', promise: fetchActivityResponse<unknown>(projectId, 'context', 'organization', 'history', null) },
      { key: 'organizationValues', promise: fetchActivityResponse<unknown>(projectId, 'context', 'organization', 'values', null) },

      // Context phase - project context
      { key: 'projectScope', promise: fetchActivityResponse<unknown>(projectId, 'context', 'project', 'scope', null) },
      { key: 'projectTrigger', promise: fetchActivityResponse<unknown>(projectId, 'context', 'project', 'trigger', null) },
      { key: 'projectSuccess', promise: fetchActivityResponse<unknown>(projectId, 'context', 'project', 'success', null) },

      // Define phase - factors (most important for slider generation)
      { key: 'factors', promise: fetchActivityResponse<unknown>(projectId, 'define', 'discover', 'factors', null) },

      // Define phase - topic information
      { key: 'topic', promise: fetchActivityResponse<unknown>(projectId, 'define', 'topic', 'investigate', null) },

      // Define phase - focus information
      { key: 'focus', promise: fetchActivityResponse<unknown>(projectId, 'define', 'topic', 'focus', null) },

      // Define phase - actors
      { key: 'actors', promise: fetchActivityResponse<unknown>(projectId, 'define', 'topic', 'actors', null) },

      // Define phase - discover
      { key: 'hopes', promise: fetchActivityResponse<unknown>(projectId, 'define', 'discover', 'hopes', null) },
      { key: 'experiences', promise: fetchActivityResponse<unknown>(projectId, 'define', 'discover', 'experiences', null) },

      // Collection phase - story question
      { key: 'storyQuestion', promise: fetchActivityResponse<unknown>(projectId, 'collection', 'story-questions', 'story-questions', null) },
    ];

    debugLog(`Starting to fetch ${fetchPromises.length} activity responses...`);

    // Execute all promises in parallel
    const promiseResults = await Promise.all(fetchPromises.map(item => item.promise));

    // Process results into a structured object
    const contextData: Record<string, unknown> = {};

    // Map the results to the corresponding keys
    fetchPromises.forEach((item, index) => {
      try {
        const result = promiseResults[index];
        // Check if result is directly usable
        if (result && typeof result === 'object') {
          contextData[item.key] = result;
          debugLog(`Successfully fetched ${item.key} data`);

          // Show a sample of the data to help debug
          const dataSample = JSON.stringify(result).substring(0, 150);
          debugLog(`${item.key} data sample: ${dataSample}...`);
        }
        // Check if result is wrapped in a data.ar_response structure
        else {
          const resultRecord = result as Record<string, unknown>;
          if (resultRecord && resultRecord.data && typeof resultRecord.data === 'object' && (resultRecord.data as Record<string, unknown>).ar_response) {
            contextData[item.key] = (resultRecord.data as Record<string, unknown>).ar_response;
            debugLog(`Successfully fetched ${item.key} data (ar_response format)`);

            // Show a sample of the data to help debug
            const dataSample = JSON.stringify((resultRecord.data as Record<string, unknown>).ar_response).substring(0, 150);
            debugLog(`${item.key} data sample: ${dataSample}...`);
          } else {
            debugLog(`No data found for ${item.key}`);
          }
        }
      } catch (error) {
        debugError(`Error processing result for ${item.key}:`, error);
      }
    });

    debugLog("Fetched context data sections:", Object.keys(contextData));
    debugLog(`Total data sections found: ${Object.keys(contextData).length}`);

    // Try to fetch any other data that might be missing but could be useful
    await fetchAdditionalContextData(projectId, contextData);

    // Final debug log to help track what data was found
    if (Object.keys(contextData).length === 0) {
      debugWarn("NO CONTEXT DATA FOUND! Check activity response paths and database content.");
    } else {
      debugLog(`Final context data has ${Object.keys(contextData).length} sections: ${Object.keys(contextData).join(', ')}`);
    }

    return contextData;
  } catch (error) {
    debugError("Error fetching comprehensive project context:", error);
    return {};
  }
};

/**
 * Fetch additional context data from other possible locations
 */
async function fetchAdditionalContextData(projectId: string, contextData: Record<string, unknown>): Promise<void> {
  try {
    debugLog("Attempting to fetch additional context data...");

    // Direct fetch from activity_responses using various common paths
    const activityPaths = [
      // Core activities - try alternative paths
      { phase: 'define', step: 'factors', activity: 'influencing-factors' },
      { phase: 'define', step: 'discover', activity: 'factors' },
      { phase: 'define', step: 'topic', activity: 'investigation' },

      // Try common alternative paths for context phase
      { phase: 'context', step: 'project-info', activity: 'about' },
      { phase: 'context', step: 'project-info', activity: 'purpose' },
      { phase: 'context', step: 'project-info', activity: 'audience' },

      // Try potential different namings for organization info
      { phase: 'context', step: 'org', activity: 'about' },
      { phase: 'context', step: 'org', activity: 'history' },
      { phase: 'context', step: 'organization-info', activity: 'about' },

      // Different potential paths for project info
      { phase: 'context', step: 'project', activity: 'about' },
      { phase: 'context', step: 'project', activity: 'description' },

      // Try some common alternative paths
      { phase: 'planning', step: 'discover', activity: 'factors' },
      { phase: 'planning', step: 'topic-planning', activity: 'describe-topics' },

      // Try additional design phase activities
      { phase: 'design', step: 'form-questions', activity: 'slider-questions' },
      { phase: 'design', step: 'form-questions', activity: 'participant-questions' },
    ];

    // Execute all activity path fetches in parallel
    const promises = activityPaths.map(path =>
      fetchActivityResponse<unknown>(
        projectId,
        path.phase,
        path.step,
        path.activity,
        null
      ).then(result => ({ path, result }))
    );

    const results = await Promise.allSettled(promises);

    // Process results
    results.forEach(promiseResult => {
      if (promiseResult.status === 'fulfilled') {
        const { path, result } = promiseResult.value;
        const key = `${path.phase}_${path.step}_${path.activity}`;

        if (result && typeof result === 'object') {
          contextData[key] = result;
          debugLog(`Found additional data for ${key}`);
        }
        else {
          const resultRecord = result as Record<string, unknown>;
          if (resultRecord && resultRecord.data && typeof resultRecord.data === 'object' && (resultRecord.data as Record<string, unknown>).ar_response) {
            contextData[key] = (resultRecord.data as Record<string, unknown>).ar_response;
            debugLog(`Found additional data for ${key} (ar_response format)`);
          }
        }
      }
    });

    // As a last resort, try to get any activity responses for this project
    // This is a brute force approach to find data when the expected paths don't work
    try {
      // Just log that we're doing this
      debugLog("Attempting to fetch any activity responses for this project...");

      // We'll try direct querying in the future if needed
    } catch (e) {
      debugError("Error fetching any activity responses:", e);
    }
  } catch (e) {
    debugError("Error fetching additional context data:", e);
  }
}
