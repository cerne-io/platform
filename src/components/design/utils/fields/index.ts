
/**
 * Consolidated form field utilities for handling form fields
 */

import type { FormField, ActivityField } from "./types";
import { getQuestionFields } from "./questionFields";
import { getActivityFields } from "./legacyFields";
import { normalizePhaseId } from "./phaseUtils";
import { generateFieldId, parseFieldId } from "./idUtils";

/**
 * Get form fields using either the new or legacy method for backward compatibility
 * This helps with the transition from the old system to the new one
 */
export const getFieldsForActivity = (phaseId: string, stepId: string, activityId: string): FormField[] => {
  // Try getting fields using the new method first
  const newFields = getQuestionFields(phaseId, stepId, activityId);
  
  // If we got fields, return them
  if (newFields.length > 0) {
    return newFields;
  }
  
  // Otherwise, fall back to the old method and convert the fields
  const oldFields = getActivityFields(stepId, activityId);
  
  // Convert ActivityField[] to FormField[]
  return oldFields.map(field => ({
    id: field.id,
    label: field.label,
    isTextarea: field.isTextarea
  }));
};

// Export all the utility functions
export {
  getQuestionFields,
  getActivityFields,
  normalizePhaseId,
  generateFieldId,
  parseFieldId
};

// Export types properly using 'export type'
export type { FormField, ActivityField };
