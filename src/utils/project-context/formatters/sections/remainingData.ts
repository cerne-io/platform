import { debugError } from "@/utils/debugLogger";
/**
 * Remaining data formatting module
 */

/**
 * Format remaining relevant data
 */
export const formatRemainingData = (rawData: Record<string, unknown>): string => {
  let text = '\n\nADDITIONAL CONTEXT:\n';
  let hasData = false;

  // Check for hopes and experiences
  if (rawData.hopes) {
    hasData = true;
    const data = rawData.hopes;

    text += `\nHopes:\n`;
    if (typeof data === 'string') {
      text += `• ${data}\n`;
    } else if (data && typeof data === 'object') {
      Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim()) {
          text += `• ${formatFieldName(key)}: ${value}\n`;
        }
      });
    }
  }

  if (rawData.experiences) {
    hasData = true;
    const data = rawData.experiences;

    text += `\nExperiences:\n`;
    if (typeof data === 'string') {
      text += `• ${data}\n`;
    } else if (data && typeof data === 'object') {
      Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim()) {
          text += `• ${formatFieldName(key)}: ${value}\n`;
        }
      });
    }
  }

  // Include any remaining important data
  const processedKeys = [
    'projectDescription', 'projectScope', 'projectTrigger', 'projectSuccess',
    'organizationAbout', 'organizationHistory', 'organizationValues',
    'factors', 'topic', 'focus', 'actors', 'storyQuestion', 'hopes', 'experiences'
  ];

  Object.entries(rawData).forEach(([key, value]) => {
    if (
      !processedKeys.includes(key) &&
      !key.includes('factor') &&
      !key.includes('_discover_factors') &&
      value !== null &&
      value !== undefined
    ) {
      try {
        if (typeof value === 'string' && value.trim()) {
          hasData = true;
          text += `\n${formatFieldName(key)}:\n• ${value}\n`;
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          const fieldText = formatObject(value as Record<string, unknown>);
          if (fieldText) {
            hasData = true;
            text += `\n${formatFieldName(key)}:\n${fieldText}`;
          }
        } else if (Array.isArray(value) && value.length > 0) {
          hasData = true;
          text += `\n${formatFieldName(key)}:\n`;
          value.forEach((item, index) => {
            if (typeof item === 'string') {
              text += `• Item ${index + 1}: ${item}\n`;
            } else if (typeof item === 'object') {
              text += `• Item ${index + 1}:\n${formatObject(item as Record<string, unknown>, '  ')}`;
            }
          });
        }
      } catch (e) {
        debugError(`Error formatting key "${key}":`, e);
      }
    }
  });

  return hasData ? text : '';
};

// Import the utility functions
import { formatFieldName, formatObject } from '../utils/formattingUtils';
