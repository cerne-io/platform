
/**
 * Utilities for handling phase IDs and normalization
 */

/**
 * Normalize phase ID to handle legacy phase names
 */
export const normalizePhaseId = (phaseId: string): string => {
  const mapping: Record<string, string> = {
    // Map any legacy phase names to current phase names
    'planning': 'define',
    'context-phase': 'context',
    'define-phase': 'define',
    'design-phase': 'design',
    'build-phase': 'build'
  };
  
  return mapping[phaseId] || phaseId;
};
