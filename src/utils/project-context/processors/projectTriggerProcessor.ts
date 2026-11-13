import { debugError } from "@/utils/debugLogger";
import { extractLocalizedOrString, isTechnicalField } from "./utils/processingUtils";

/**
 * Process project trigger information from activity responses
 */
export function processProjectTrigger(context: string, activityResponses: Record<string, unknown>): string {
  if (activityResponses.projectTrigger) {
    try {
      const triggerData = activityResponses.projectTrigger;
      context += `\nPROJECT TRIGGER:\n`;

      const extractedTrigger = extractLocalizedOrString(triggerData);
      if (extractedTrigger) {
        context += `- ${extractedTrigger}\n`;
      } else if (typeof triggerData === 'object' && triggerData !== null) {
        const triggerObj = triggerData as Record<string, unknown>;
        
        const projectTrigger = extractLocalizedOrString(triggerObj.project_trigger);
        if (projectTrigger) {
          context += `- ${projectTrigger}\n`;
        }

        // Add any other fields that might be present
        Object.entries(triggerObj).forEach(([key, value]) => {
          if (isTechnicalField(key)) return;
          
          if (key !== 'project_trigger') {
            const extractedVal = extractLocalizedOrString(value);
            if (extractedVal) {
              context += `- ${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}: ${extractedVal}\n`;
            } else if (typeof value === 'object' && value !== null) {
              try {
                Object.entries(value as Record<string, unknown>).forEach(([nestedKey, nestedValue]) => {
                  if (isTechnicalField(nestedKey)) return;
                  
                  const extractedNested = extractLocalizedOrString(nestedValue);
                  if (extractedNested) {
                    context += `- ${key} ${nestedKey}: ${extractedNested}\n`;
                  }
                });
              } catch (err) {
                debugError(`Error processing nested trigger data for ${key}:`, err);
              }
            }
          }
        });
      }
    } catch (e) {
      debugError("Error processing project trigger data:", e);
    }
  }

  return context;
}
