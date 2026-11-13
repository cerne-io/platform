import { supabase } from "@/integrations/supabase/client";
import { checkIfTemplateProject } from "../core/projectUtils";
import { asJsonObject } from "@/services/supabaseSync/core/typeUtils";
import { cacheActivityResponse } from "../cache/responseCache";
import { debugLog, debugError } from "@/utils/debugLogger";
import { SaveTemplateActivityResponseResult } from "@/services/supabaseSync/types/responseTypes";

/**
 * Save an activity response to Supabase
 * @param projectId The project ID
 * @param phaseId The phase ID
 * @param stepId The step ID
 * @param activityId The activity ID
 * @param data The data to save
 * @param responseKey Optional key to extract from the data
 * @returns Promise resolving to a boolean indicating success
 */
export const saveActivityResponse = async <T>(
  projectId: string,
  phaseId: string,
  stepId: string,
  activityId: string,
  data: T,
  responseKey: string | null = null
): Promise<boolean> => {
  if (!projectId) {
    debugError('Cannot save activity response: Missing project ID');
    return false;
  }

  try {
    // Check if this is a template project
    const isTemplate = await checkIfTemplateProject(projectId);

    // If this is a template project, use the template-specific function
    if (isTemplate) {
      debugLog(`Project ${projectId} is a template, using template-specific save function`);
      const success = await saveToTemplateTable<T>(
        projectId,
        phaseId,
        stepId,
        activityId,
        data,
        responseKey
      );

      // Cache the data regardless of where it was saved
      if (success) {
        // Cache the full activity response logic: if responseKey is used, we must cache the object { [key]: data }
        // because fetchActivityResponse logic usually returns the full object (which is then drilled down).
        // However, if we save partial data, we should probably update the cache with that structure.
        const dataToCache = responseKey ? { [responseKey]: data } : data;
        // Fix: Cast as unknown to T because cacheActivityResponse expects T but we might be passing {key: T}
        // This suggests T in saveActivityResponse is the value, not the response object.
        // We really should cache the response object.
        cacheActivityResponse(projectId, phaseId, stepId, activityId, dataToCache as unknown as T);
      }

      return success;
    }

    // Regular project, use normal save process
    const dataToSave = responseKey ? { [responseKey]: data } : data;
    const jsonData = asJsonObject(dataToSave);

    // Enhanced logging for story question and other critical data
    debugLog(`RPC CALL: insert_activity_response for ${projectId}/${phaseId}/${stepId}/${activityId}`, {
      dataToSave: typeof dataToSave === 'string' ? dataToSave.substring(0, 50) : Object.keys(dataToSave || {}),
      jsonData: typeof jsonData === 'string' ? jsonData.substring(0, 50) : (jsonData && Object.keys(jsonData).length)
    });

    if (activityId === 'story-questions' || activityId === 'story-question') {
      debugLog("SAVING STORY QUESTION JSON:", jsonData);
    }

    const { data: rpcResult, error } = await supabase.rpc('insert_activity_response', {
      project_id: projectId,
      phase_id: phaseId,
      step_id: stepId,
      activity_id: activityId,
      response_data: jsonData,
    });

    if (error) {
      debugError(`Error saving activity response for ${activityId}:`, error);
      return false;
    }

    // Some RPCs return a JSON object with an internal error instead of throwing
    if (rpcResult && typeof rpcResult === 'object' && 'error' in (rpcResult as Record<string, unknown>)) {
      const err = (rpcResult as Record<string, unknown>).error;
      const errorCode = (rpcResult as Record<string, unknown>).error_code;
      debugError(`RPC reported application error saving ${activityId}:`, { err, errorCode });
      return false;
    }

    // Cache the successful response
    cacheActivityResponse(projectId, phaseId, stepId, activityId, dataToSave as unknown as T);

    return true;
  } catch (error) {
    debugError(`Error in saveActivityResponse for ${activityId}:`, error);
    return false;
  }
};

/**
 * Save data specifically to the template_activity_responses table
 * Only superadmins can use this function (enforced by the RPC)
 */
const saveToTemplateTable = async <T>(
  projectId: string,
  phaseId: string,
  stepId: string,
  activityId: string,
  data: T,
  responseKey: string | null = null
): Promise<boolean> => {
  debugLog(`SAVE TEMPLATE: Attempting to save template data for ${projectId}/${phaseId}/${stepId}/${activityId}`);

  try {
    // Process the data using the responseKey if provided
    const dataToSave = responseKey ? { [responseKey]: data } : data;

    // Use the RPC function to save to template_activity_responses table
    // Convert the generic data type to Json using asJsonObject utility
    const { data: rpcData, error: rpcError } = await supabase.rpc('save_template_activity_response', {
      project_id: projectId,
      phase_id: phaseId,
      step_id: stepId,
      activity_id: activityId,
      response_data: asJsonObject(dataToSave)
    });

    if (rpcError) {
      debugError(`Error saving template data via RPC: ${rpcError.message}`, rpcError);
      return false;
    }

    // Type the result correctly
    const typedResult = rpcData as unknown as SaveTemplateActivityResponseResult;

    // Check if we got a successful response
    if (!typedResult || typeof typedResult !== 'object' || typedResult.error) {
      debugError(`Error saving template data:`, typedResult?.error || 'Unknown error');
      return false;
    }

    debugLog(`Successfully saved template data for ${phaseId}/${stepId}/${activityId}`);
    return true;
  } catch (error) {
    debugError(`Error in saveToTemplateTable: ${error}`);
    return false;
  }
};

