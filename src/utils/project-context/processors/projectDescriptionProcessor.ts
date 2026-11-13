import { debugError } from "@/utils/debugLogger";
import { extractLocalizedOrString, isTechnicalField } from "./utils/processingUtils";
/**
 * Process project description information
 */

/**
 * Process project description information from activity responses
 */
export function processProjectDescription(context: string, activityResponses: Record<string, unknown>): string {
  if (activityResponses.projectDescription) {
    try {
      const projectDetails = activityResponses.projectDescription;
      context += `\nPROJECT CONTEXT DETAILS:\n`;

      const extractedDetails = extractLocalizedOrString(projectDetails);
      if (extractedDetails) {
        context += `- Description: ${extractedDetails}\n`;
      } else if (typeof projectDetails === 'object' && projectDetails !== null) {
        const detailsObj = projectDetails as Record<string, unknown>;
        
        const extractField = (field: string) => {
           const val = extractLocalizedOrString(detailsObj[field]);
           return val ? val : null;
        };

        const purpose = extractField('purpose');
        if (purpose) context += `- Purpose: ${purpose}\n`;
        
        const audience = extractField('audience');
        if (audience) context += `- Audience: ${audience}\n`;
        
        const goals = extractField('goals');
        if (goals) context += `- Goals: ${goals}\n`;
        
        const description = extractField('description');
        if (description) context += `- Description: ${description}\n`;

        // Add any other fields that might be present
        Object.entries(detailsObj).forEach(([key, value]) => {
          if (isTechnicalField(key)) return;
          
          if (!['purpose', 'audience', 'goals', 'description'].includes(key)) {
            const extractedVal = extractLocalizedOrString(value);
            if (extractedVal) {
              context += `- ${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}: ${extractedVal}\n`;
            }
          }
        });
      }
    } catch (e) {
      debugError("Error processing projectDescription:", e);
    }
  }

  return context;
}
