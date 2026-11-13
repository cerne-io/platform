
/**
 * Manages debug information for AI slider question generation
 */

// Debug information type definition
export interface AIDebugInfo {
  prompt: string;
  context: string;
  response: string | null;
  fullPrompt: string; // Store the combined prompt with context
  error?: string;     // Added error field to the interface
}

// Global debug information storage
let lastDebugInfo: AIDebugInfo | null = null;

/**
 * Sets the debug info 
 */
export const setDebugInfo = (info: AIDebugInfo): void => {
  lastDebugInfo = info;
};

/**
 * Updates a specific field in the debug info
 */
export const updateDebugInfoField = <K extends keyof AIDebugInfo>(
  field: K, 
  value: AIDebugInfo[K]
): void => {
  if (lastDebugInfo) {
    lastDebugInfo = {
      ...lastDebugInfo,
      [field]: value
    };
  }
};

/**
 * Gets the last AI debug information
 */
export const getLastDebugInfo = (): AIDebugInfo | null => {
  return lastDebugInfo;
};

/**
 * Creates initial debug info object
 */
export const createDebugInfo = (
  prompt: string,
  context: string,
  fullPrompt: string
): AIDebugInfo => {
  return {
    prompt,
    context,
    response: null,
    fullPrompt,
    error: undefined
  };
};
