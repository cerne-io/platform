
/**
 * Utility functions for handling field IDs
 */

/**
 * Generate a field ID based on activity and field name
 */
export const generateFieldId = (activityId: string, fieldName: string): string => {
  return `${activityId}_${fieldName}`;
};

/**
 * Parse a field ID to extract activity ID and field name
 */
export const parseFieldId = (fieldId: string): { activityId: string, fieldName: string } => {
  const parts = fieldId.split('_');
  const fieldName = parts.pop() || '';
  const activityId = parts.join('_');
  
  return { activityId, fieldName };
};
