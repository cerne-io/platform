
import { supabase } from "@/integrations/supabase/client";
import { debugSupabaseQuery } from "../core/debugUtils";
import { generateCacheKey, getCachedResponse, setCachedResponse, cacheActivityResponse } from "../cache/responseCache";
import { checkIfTemplateProject } from "../core/projectUtils";
import { normalizePhaseId } from "@/components/design/utils/fields/phaseUtils";
import { FetchActivityResponseResult, FetchTemplateActivityResponseResult } from "../../types/responseTypes";
import { debugLog, debugError } from "@/utils/debugLogger";

/**
 * Fetch activity response from Supabase with caching and error handling
 */
export const fetchActivityResponse = async <T>(
  projectId: string,
  phaseId: string,
  stepId: string,
  activityId: string,
  defaultValue: T = null as unknown as T,
  responseKey: string | null = null,
  forceRefresh: boolean = false
): Promise<T> => {
  debugSupabaseQuery(`Fetching activity response: ${phaseId}/${stepId}/${activityId}${forceRefresh ? ' (force refresh)' : ''}`);

  try {
    // Normalize the phase ID to handle both old and new naming
    const normalizedPhaseId = normalizePhaseId(phaseId);

    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedResult = await tryGetFromCache<T>(
        projectId,
        phaseId,
        normalizedPhaseId,
        stepId,
        activityId,
        responseKey
      );

      if (cachedResult !== null) {
        return cachedResult;
      }
    } else {
      debugLog(`Force refresh requested for ${activityId}, bypassing cache completely`);
    }

    // Check if this is a template project
    const isTemplateProject = await checkIfTemplateProject(projectId);

    // Special handling for form appearance editor
    if (activityId === 'form-appearance-editor') {
      // Try direct query to the exact path where the data is known to be
      const exactPathResult = await directFetchFormAppearance(projectId);

      if (exactPathResult) {
        // Return directly without additional type assertion
        return exactPathResult as T;
      }
    }

    // First try with the original phaseId
    let result = await fetchFromSupabase<T>(
      projectId,
      phaseId,
      stepId,
      activityId,
      isTemplateProject
    );

    // If not found and normalized phase is different, try with normalized phaseId
    if (!result && phaseId !== normalizedPhaseId) {
      debugLog(`FETCH: Not found with original phase, trying normalized phase ${normalizedPhaseId}`);
      result = await fetchFromSupabase<T>(
        projectId,
        normalizedPhaseId,
        stepId,
        activityId,
        isTemplateProject
      );

      // If found with normalized phaseId, cache it with both keys
      if (result) {
        cacheActivityResponse(projectId, phaseId, stepId, activityId, result, normalizedPhaseId);
      }
    }

    // Special handling for form appearance data - try alternate paths
    if (!result && activityId === 'form-appearance-editor') {
      // Try common alternative phase IDs for form appearance data
      const additionalPhases = ['collect', 'design', 'form-appearance', 'build'];

      for (const phase of additionalPhases) {
        if (phase !== phaseId && phase !== normalizedPhaseId && !result) {
          result = await fetchFromSupabase<T>(
            projectId,
            phase,
            stepId,
            activityId,
            isTemplateProject
          );

          if (result) {
            break;
          }
        }
      }

      // Final fallback: try to find any form appearance data
      if (!result) {
        const fallbackResult = await findFormAppearanceInAnyPath(projectId);
        if (fallbackResult) {
          // Simple direct assignment for type compatibility
          return fallbackResult as T;
        }
      }
    }

    if (result) {
      // Extract specific key if requested
      if (responseKey && typeof result === 'object' && result !== null && responseKey in (result as object)) {
        return (result as Record<string, unknown>)[responseKey] as T;
      }
      return result;
    }

    debugSupabaseQuery(`No activity response found for ${activityId}`);
    return defaultValue;
  } catch (error) {
    debugError(`Error fetching activity response for ${activityId}:`, error);
    return defaultValue;
  }
};

/**
 * Try to get activity response from cache
 */
const tryGetFromCache = async <T>(
  projectId: string,
  phaseId: string,
  normalizedPhaseId: string,
  stepId: string,
  activityId: string,
  responseKey: string | null
): Promise<T | null> => {
  // Generate cache key for original phaseId
  const originalCacheKey = generateCacheKey(projectId, phaseId, stepId, activityId);

  // First check if we have cached data with original phaseId
  const cachedData = getCachedResponse<T>(originalCacheKey, projectId, responseKey);

  if (cachedData) {
    debugLog(`Using cached data for ${activityId} with original phase ${phaseId}`);
    return cachedData;
  }

  // If normalized phaseId is different, also check that cache
  if (phaseId !== normalizedPhaseId) {
    const normalizedCacheKey = generateCacheKey(projectId, normalizedPhaseId, stepId, activityId);
    const normalizedCachedData = getCachedResponse<T>(normalizedCacheKey, projectId, responseKey);

    if (normalizedCachedData) {
      debugLog(`Using cached data for ${activityId} with normalized phase ${normalizedPhaseId}`);
      // Also cache it with the original key for future use
      setCachedResponse(originalCacheKey, normalizedCachedData, projectId, phaseId, stepId, activityId);
      return normalizedCachedData;
    }
  }

  return null;
};

/**
 * Fetch activity response data from Supabase
 */
const fetchFromSupabase = async <T>(
  projectId: string,
  phaseId: string,
  stepId: string,
  activityId: string,
  isTemplateProject: boolean = false
): Promise<T | null> => {
  debugLog(`FETCH: About to query Supabase for project=${projectId}, phase=${phaseId}, step=${stepId}, activity=${activityId}`);

  try {
    // For template projects, use special query with service role to bypass RLS
    if (isTemplateProject) {
      return await fetchTemplateProjectData<T>(projectId, phaseId, stepId, activityId);
    } else {
      return await fetchRegularProjectData<T>(projectId, phaseId, stepId, activityId);
    }
  } catch (error) {
    debugError(`Error in fetchFromSupabase for ${activityId}:`, error);
    return null;
  }
};

/**
 * Fetch data specifically for template projects using RPC
 */
const fetchTemplateProjectData = async <T>(
  projectId: string,
  phaseId: string,
  stepId: string,
  activityId: string
): Promise<T | null> => {
  debugLog(`FETCH: Project ${projectId} is a template project, using special fetching logic`);

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('fetch_template_activity_response', {
      project_id: projectId,
      phase_id: phaseId,
      step_id: stepId,
      activity_id: activityId
    });

    if (rpcError) {
      // Fallback to older RPC if new one fails (for compatibility)
      console.warn("Falling back to fetch_activity_response RPC");
      const { data: fallbackData, error: fallbackError } = await supabase.rpc('fetch_activity_response', {
        project_id: projectId,
        phase_id: phaseId,
        step_id: stepId,
        activity_id: activityId
      });

      if (fallbackError) {
        debugError(`Supabase RPC fetch error for phase=${phaseId}, step=${stepId}, activity=${activityId}:`, rpcError);
        return null;
      }

      const legacyResult = fallbackData as unknown as FetchActivityResponseResult;

      if (!legacyResult.found || !legacyResult.data) {
        return null;
      }

      const responseData = legacyResult.data.ar_response;
      const cacheKey = generateCacheKey(projectId, phaseId, stepId, activityId);
      setCachedResponse(cacheKey, responseData, projectId, phaseId, stepId, activityId);

      return responseData as unknown as T;
    }

    // First convert to unknown then to our expected type
    const typedResult = rpcData as unknown as FetchTemplateActivityResponseResult;

    // Check if we got a valid response with the expected structure
    if (!typedResult || typeof typedResult !== 'object' || !('found' in typedResult)) {
      debugLog(`Invalid or unexpected response format from template RPC`);
      return null;
    }

    // Now it's safe to check if we found data
    if (!typedResult.found || !typedResult.data) {
      debugLog(`No template data found for ${phaseId}/${stepId}/${activityId}`);
      return null;
    }

    // Extract and return the response data
    const responseData = typedResult.data.ar_response;

    // Cache it
    const cacheKey = generateCacheKey(projectId, phaseId, stepId, activityId);
    setCachedResponse(cacheKey, responseData, projectId, phaseId, stepId, activityId);

    return responseData as unknown as T;
  } catch (error) {
    debugError(`Error in fetchTemplateProjectData: ${error}`);
    return null;
  }
};

/**
 * Fetch data for regular projects using standard query
 */
const fetchRegularProjectData = async <T>(
  projectId: string,
  phaseId: string,
  stepId: string,
  activityId: string
): Promise<T | null> => {
  const { data, error } = await supabase
    .from('activity_responses')
    .select('ar_response, id, updated_at')
    .eq('ar_project_id', projectId)
    .eq('ar_phase_id', phaseId)
    .eq('ar_step_id', stepId)
    .eq('ar_activity_id', activityId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    debugError(`Supabase fetch error for phase=${phaseId}, step=${stepId}, activity=${activityId}:`, error);
    return null;
  }

  // No data from Supabase
  if (!data) {
    debugSupabaseQuery(`No activity response found for ${phaseId}/${stepId}/${activityId}`);
    return null;
  }

  const responseData = data.ar_response;
  const responseId = data.id;

  if (!responseData) {
    debugSupabaseQuery(`No response content found for ${phaseId}/${stepId}/${activityId}`);
    return null;
  }

  debugLog(`FETCH: Got data from Supabase (ID: ${responseId}):`, responseData);

  // Store the complete response in cache for future use
  const cacheKey = generateCacheKey(projectId, phaseId, stepId, activityId);
  setCachedResponse(cacheKey, responseData, projectId, phaseId, stepId, activityId);

  return responseData as unknown as T;
};

/**
 * Fetch form appearance data directly from known path
 */
const directFetchFormAppearance = async (projectId: string): Promise<unknown> => {
  try {
    const { data, error } = await supabase
      .from('activity_responses')
      .select('ar_response')
      .eq('ar_project_id', projectId)
      .eq('ar_phase_id', 'build')
      .eq('ar_step_id', 'form-appearance')
      .eq('ar_activity_id', 'form-appearance-editor')
      .maybeSingle();

    if (error) {
      debugError(`DIRECT FETCH ERROR: ${error.message}`, error);
      return null;
    }
    return data?.ar_response || null;
  } catch (err) {
    debugError(`Error in direct form appearance fetch:`, err);
    return null;
  }
};

/**
 * Find form appearance data in any path
 */
const findFormAppearanceInAnyPath = async (projectId: string): Promise<unknown> => {
  try {
    const { data, error } = await supabase
      .from('activity_responses')
      .select('ar_response, ar_phase_id, ar_step_id')
      .eq('ar_project_id', projectId)
      .eq('ar_activity_id', 'form-appearance-editor')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data?.ar_response) {
      return data.ar_response;
    }
    return null;
  } catch (err) {
    debugError(`Error in fallback form appearance query:`, err);
    return null;
  }
};



