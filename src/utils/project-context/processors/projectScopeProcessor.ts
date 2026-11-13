import { debugError } from "@/utils/debugLogger";
import { extractLocalizedOrString, isTechnicalField } from "./utils/processingUtils";

/**
 * Process project scope information from activity responses
 */
export function processProjectScope(context: string, activityResponses: Record<string, unknown>): string {
  if (activityResponses.projectScope) {
    try {
      const scopeData = activityResponses.projectScope;
      context += `\nPROJECT SCOPE:\n`;

      const extractedScope = extractLocalizedOrString(scopeData);
      if (extractedScope) {
        context += `- ${extractedScope}\n`;
      } else if (typeof scopeData === 'object' && scopeData !== null) {
        const scopeObj = scopeData as Record<string, unknown>;
        
        const extractField = (field: string) => {
           const val = extractLocalizedOrString(scopeObj[field]);
           return val ? val : null;
        };

        const projectAbout = extractField('project_about');
        if (projectAbout) context += `- About: ${projectAbout}\n`;
        
        const problemSolving = extractField('problem_solving');
        if (problemSolving) context += `- Problem to Solve: ${problemSolving}\n`;

        // Add any other fields that might be present
        Object.entries(scopeObj).forEach(([key, value]) => {
          if (isTechnicalField(key)) return;
          
          if (!['project_about', 'problem_solving'].includes(key)) {
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
                debugError(`Error processing nested scope data for ${key}:`, err);
              }
            }
          }
        });
      }
    } catch (e) {
      debugError("Error processing project scope data:", e);
    }
  }

  return context;
}
