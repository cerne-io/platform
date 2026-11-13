import { debugError } from "@/utils/debugLogger";
import { extractLocalizedOrString, isTechnicalField } from "./utils/processingUtils";

/**
 * Process topic information
 */
export function processTopic(context: string, activityResponses: Record<string, unknown>): string {
  const topicKeys = ['topic', 'focus', 'planningTopic', 'focusArea', 'topicArea', 'topicInvestigation'];
  let topicContext = '';
  let hasTopicData = false;

  for (const key of topicKeys) {
    if (activityResponses[key]) {
      try {
        const topicData = activityResponses[key];
        if (!hasTopicData) {
          topicContext += `\nTOPIC INVESTIGATION:\n`;
          hasTopicData = true;
        }

        const extractedTopic = extractLocalizedOrString(topicData);
        if (extractedTopic) {
          topicContext += `- ${key}: ${extractedTopic}\n`;
        } else if (typeof topicData === 'object' && topicData !== null) {
          const topicObj = topicData as Record<string, unknown>;
          const topicFields = [
            'topic', 'investigation_topic', 'description', 'importance',
            'focus', 'focus_area', 'explanation', 'value', 'area',
            'reason', 'details', 'significance', 'motivation'
          ];

          // First process common fields in a standard order
          topicFields.forEach(field => {
            const extractedField = extractLocalizedOrString(topicObj[field]);
            if (extractedField) {
              topicContext += `- ${key} ${field.replace('_', ' ')}: ${extractedField}\n`;
            }
          });

          // Then process any remaining fields
          Object.entries(topicObj).forEach(([field, value]) => {
            if (isTechnicalField(field)) return;
            
            if (!topicFields.includes(field)) {
              const extractedVal = extractLocalizedOrString(value);
              if (extractedVal) {
                topicContext += `- ${key} ${field.replace('_', ' ')}: ${extractedVal}\n`;
              } else if (typeof value === 'object' && value !== null) {
                // Handle nested objects
                let nestedAdded = false;
                let nestedContext = `- ${key} ${field.replace('_', ' ')}:\n`;
                
                Object.entries(value as Record<string, unknown>).forEach(([nestedField, nestedValue]) => {
                  if (isTechnicalField(nestedField)) return;
                  
                  const extractedNested = extractLocalizedOrString(nestedValue);
                  if (extractedNested) {
                    nestedContext += `  - ${nestedField.replace('_', ' ')}: ${extractedNested}\n`;
                    nestedAdded = true;
                  }
                });
                
                if (nestedAdded) {
                  topicContext += nestedContext;
                }
              }
            }
          });
        }
      } catch (e) {
        debugError(`Error processing ${key} data:`, e);
      }
    }
  }

  return context + (hasTopicData ? topicContext : '');
}
