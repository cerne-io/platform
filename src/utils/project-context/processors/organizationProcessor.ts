import { debugError } from "@/utils/debugLogger";
import { extractLocalizedOrString, isTechnicalField } from "./utils/processingUtils";
/**
 * Process organization information
 */
export function processOrganizationInfo(context: string, activityResponses: Record<string, unknown>): string {
  const orgKeys = ['organizationAbout', 'organizationHistory', 'organizationValues', 'organization', 'organizationInfo'];
  let orgContext = '';
  let hasOrgData = false;

  for (const key of orgKeys) {
    if (activityResponses[key]) {
      try {
        const orgData = activityResponses[key];
        if (!hasOrgData) {
          orgContext += `\nORGANIZATION INFORMATION:\n`;
          hasOrgData = true;
        }

        const extractedOrg = extractLocalizedOrString(orgData);
        if (extractedOrg) {
          orgContext += `- ${key.replace('organization', '')}: ${extractedOrg}\n`;
        } else if (typeof orgData === 'object' && orgData !== null) {
          // Process all fields within the organization object
          Object.entries(orgData as Record<string, unknown>).forEach(([field, value]) => {
            if (isTechnicalField(field)) return;
            
            const extractedField = extractLocalizedOrString(value);
            if (extractedField) {
              orgContext += `- ${key.replace('organization', '')} ${field}: ${extractedField}\n`;
            } else if (typeof value === 'object' && value !== null) {
              // Handle nested objects
              try {
                let nestedAdded = false;
                let nestedContext = `- ${key.replace('organization', '')} ${field}:\n`;
                Object.entries(value as Record<string, unknown>).forEach(([nestedField, nestedValue]) => {
                  if (isTechnicalField(nestedField)) return;
                  
                  const extractedNested = extractLocalizedOrString(nestedValue);
                  if (extractedNested) {
                    nestedContext += `  - ${nestedField}: ${extractedNested}\n`;
                    nestedAdded = true;
                  }
                });
                
                if (nestedAdded) orgContext += nestedContext;
              } catch (err) {
                debugError(`Error processing nested org data for ${key}.${field}:`, err);
              }
            }
          });
        }
      } catch (e) {
        debugError(`Error processing ${key} data:`, e);
      }
    }
  }

  return context + (hasOrgData ? orgContext : '');
}
