
/**
 * Process remaining activity responses
 */
import { debugError } from "@/utils/debugLogger";
import { extractLocalizedOrString, isTechnicalField } from "./utils/processingUtils";

/**
 * Process all remaining activity responses that aren't handled by specialized processors
 */
export function processRemainingResponses(context: string, activityResponses: Record<string, unknown>): string {
  // Skip these keys as they are handled by specialized processors
  const processedKeys = [
    'projectDescription',
    'projectTrigger',
    'projectScope',
    'projectSuccess',
    'organizationAbout',
    'organizationHistory',
    'organizationValues',
    'organization',
    'organizationInfo',
    'factors',
    'altFactors',
    'moreAltFactors',
    'topic',
    'focus',
    'actors',
    'storyQuestion'
  ];

  // Process any remaining keys that might contain useful information
  let miscContext = '';
  let hasMiscData = false;

  for (const [key, value] of Object.entries(activityResponses)) {
    if (processedKeys.includes(key) || key.includes('factor') || key.includes('_discover_factors') || isTechnicalField(key)) {
      continue;
    }
      
    try {
      const extractedVal = extractLocalizedOrString(value);
      if (extractedVal) {
        if (!hasMiscData) {
          miscContext += `\nADDITIONAL INFORMATION:\n`;
          hasMiscData = true;
        }
        miscContext += `- ${key}: ${extractedVal}\n`;
      } else if (typeof value === 'object' && value !== null) {
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');

        // Process hopes, experiences and other detailed objects differently
        if (key === 'hopes' || key === 'experiences') {
          if (!hasMiscData) {
            miscContext += `\nADDITIONAL INFORMATION:\n`;
            hasMiscData = true;
          }
          miscContext += `- ${formattedKey}:\n`;

          for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
            if (isTechnicalField(subKey)) continue;
            
            const extractedSub = extractLocalizedOrString(subValue);
            if (extractedSub) {
              miscContext += `  - ${subKey}: ${extractedSub}\n`;
            }
          }
        } else {
          // For other objects, try to extract meaningful data
          let hasObjectData = false;
          let objectContext = `- ${formattedKey}:\n`;

          for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
            if (isTechnicalField(subKey)) continue;
            
            const extractedSub = extractLocalizedOrString(subValue);
            if (extractedSub) {
              hasObjectData = true;
              objectContext += `  - ${subKey}: ${extractedSub}\n`;
            } else if (typeof subValue === 'object' && subValue !== null) {
              // Handle nested objects (2 levels max to avoid excessive nesting)
              for (const [nestedKey, nestedValue] of Object.entries(subValue as Record<string, unknown>)) {
                if (isTechnicalField(nestedKey)) continue;
                
                const extractedNested = extractLocalizedOrString(nestedValue);
                if (extractedNested) {
                  hasObjectData = true;
                  objectContext += `  - ${subKey} ${nestedKey}: ${extractedNested}\n`;
                }
              }
            }
          }

          if (hasObjectData) {
            if (!hasMiscData) {
              miscContext += `\nADDITIONAL INFORMATION:\n`;
              hasMiscData = true;
            }
            miscContext += objectContext;
          }
        }
      }
    } catch (e) {
      debugError(`Error processing miscellaneous data for key ${key}:`, e);
    }
  }

  return context + (hasMiscData ? miscContext : '');
}
