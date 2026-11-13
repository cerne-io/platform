import { debugError } from "@/utils/debugLogger";
import { extractLocalizedOrString, isTechnicalField } from "./utils/processingUtils";

/**
 * Process project success information from activity responses
 */
export function processProjectSuccess(context: string, activityResponses: Record<string, unknown>): string {
  if (activityResponses.projectSuccess) {
    try {
      const successData = activityResponses.projectSuccess;
      context += `\nPROJECT SUCCESS CRITERIA:\n`;

      const extractedSuccess = extractLocalizedOrString(successData);
      if (extractedSuccess) {
        context += `- ${extractedSuccess}\n`;
      } else if (typeof successData === 'object' && successData !== null) {
        const successObj = successData as Record<string, unknown>;
        
        const achievement = extractLocalizedOrString(successObj.achievement);
        if (achievement) context += `- Achievement: ${achievement}\n`;
        
        if (successObj.success_criteria) {
          const criteria = extractLocalizedOrString(successObj.success_criteria);
          if (criteria) {
            context += `- Success Criteria: ${criteria}\n`;

            // Try to parse any bullet points in success criteria for better formatting
            if (criteria.includes('•') || criteria.includes('-') || criteria.includes('*')) {
              const bulletPoints = criteria
                .split(/\n|•|⦁|·|●|\*|-/)
                .map((point: string) => point.trim())
                .filter((point: string) => point.length > 0);

              if (bulletPoints.length > 1) {
                context += "Success criteria details:\n";
                bulletPoints.forEach((point: string) => {
                  if (point) context += `  • ${point}\n`;
                });
              }
            }
          }
        }

        // Add any other fields that might be present
        Object.entries(successObj).forEach(([key, value]) => {
          if (isTechnicalField(key)) return;
          
          if (!['achievement', 'success_criteria'].includes(key)) {
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
                debugError(`Error processing nested success data for ${key}:`, err);
              }
            }
          }
        });
      }
    } catch (e) {
      debugError("Error processing project success data:", e);
    }
  }

  return context;
}
