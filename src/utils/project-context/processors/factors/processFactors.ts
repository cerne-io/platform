
/**
 * Process project factors from activity responses
 */
import { extractFactorArray } from './factorUtils';
import { debugLog, debugError } from "@/utils/debugLogger";

/**
 * Process factors from activity response data
 */
export function processFactors(context: string, activityResponses: Record<string, unknown>): boolean {
  let factorsProcessed = false;

  try {
    // Check for factors in the primary location
    if (activityResponses.factors) {
      const factorsData = activityResponses.factors;
      debugLog("Processing factors data:", factorsData);

      context += `\nPROJECT FACTORS:\n`;

      if (typeof factorsData === 'object' && factorsData !== null) {
        const factorsObj = factorsData as Record<string, unknown>;

        if (factorsObj.influencing_factors && typeof factorsObj.influencing_factors === 'string') {
          const factorText = factorsObj.influencing_factors;

          // Split the factors by newlines or bullets and process each
          const factorsArray = extractFactorArray(factorText);

          if (factorsArray.length > 0) {
            factorsArray.forEach(factor => {
              context += `- ${factor}\n`;
            });
            factorsProcessed = true;
          } else {
            // Try to use the raw text if we couldn't parse bullet points
            context += `- ${factorText}\n`;
            factorsProcessed = true;
          }
        } else {
          // Try to extract factors from arbitrary object structure
          for (const [key, value] of Object.entries(factorsObj)) {
            if (typeof value === 'string' && value.trim()) {
              if (key.includes('factor') || key.includes('influence') || key === 'text' || key === 'content') {
                context += `- ${value}\n`;
                factorsProcessed = true;
              } else {
                context += `- ${key}: ${value}\n`;
                factorsProcessed = true;
              }
            }
          }
        }
      } else if (typeof factorsData === 'string' && factorsData.trim()) {
        // Handle case where the whole response is just a string
        context += `- ${factorsData}\n`;
        factorsProcessed = true;
      }
    }
  } catch (e) {
    debugError("Error processing factors:", e);
  }

  return factorsProcessed;
}
