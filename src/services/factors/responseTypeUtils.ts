
import { ActivityFormData } from "@/types/activity";

/**
 * Converts an unknown response object to ActivityFormData
 * by extracting all string values
 * @param response - The response object to convert
 * @returns ActivityFormData with string values only
 */
export const convertToActivityFormData = (response: unknown): ActivityFormData => {
  const typedResponse: ActivityFormData = {};
  
  if (typeof response === 'object' && response !== null) {
    Object.entries(response as Record<string, unknown>).forEach(([key, value]) => {
      if (typeof value === 'string') {
        typedResponse[key] = value;
      }
    });
  }
  
  return typedResponse;
};

/**
 * Extracts a single string field from an unknown response
 * @param response - The response object
 * @param fieldName - The field name to extract
 * @returns ActivityFormData with the single field or empty object
 */
export const extractStringField = (response: unknown, fieldName: string): ActivityFormData => {
  if (typeof response === 'object' && 
      response !== null && 
      fieldName in (response as Record<string, unknown>) && 
      typeof (response as Record<string, unknown>)[fieldName] === 'string') {
    
    return { [fieldName]: (response as Record<string, unknown>)[fieldName] as string };
  }
  
  return {};
};
