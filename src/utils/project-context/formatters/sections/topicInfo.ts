
/**
 * Topic information formatting module
 */

/**
 * Format topic information
 */
export const formatTopicInfo = (rawData: Record<string, unknown>): string => {
  let text = '\n\nTOPIC INFORMATION:\n';
  let hasData = false;

  // Topic investigation
  if (rawData.topic) {
    hasData = true;
    const data = rawData.topic;

    if (typeof data === 'string') {
      text += `• Topic: ${data}\n`;
    } else if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;
      if (dataObj.topic_description) text += `• Description: ${dataObj.topic_description}\n`;
      if (dataObj.topic_importance) text += `• Importance: ${dataObj.topic_importance}\n`;

      Object.entries(dataObj).forEach(([key, value]) => {
        if (!['topic_description', 'topic_importance'].includes(key) && typeof value === 'string' && value.trim()) {
          text += `• ${formatFieldName(key)}: ${value}\n`;
        }
      });
    }
  }

  // Topic focus
  if (rawData.focus) {
    hasData = true;
    const data = rawData.focus;

    if (typeof data === 'string') {
      text += `• Focus: ${data}\n`;
    } else if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;
      if (dataObj.focus_description) text += `• Focus Description: ${dataObj.focus_description}\n`;

      Object.entries(dataObj).forEach(([key, value]) => {
        if (key !== 'focus_description' && typeof value === 'string' && value.trim()) {
          text += `• ${formatFieldName(key)}: ${value}\n`;
        }
      });
    }
  }

  // Actors
  if (rawData.actors) {
    hasData = true;
    const data = rawData.actors;

    if (typeof data === 'string') {
      text += `• Actors: ${data}\n`;
    } else if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;
      if (dataObj.actors_description) text += `• Actors: ${dataObj.actors_description}\n`;

      Object.entries(dataObj).forEach(([key, value]) => {
        if (key !== 'actors_description' && typeof value === 'string' && value.trim()) {
          text += `• ${formatFieldName(key)}: ${value}\n`;
        }
      });
    }
  }

  return hasData ? text : '';
};

// Import the utility function
import { formatFieldName } from '../utils/formattingUtils';
