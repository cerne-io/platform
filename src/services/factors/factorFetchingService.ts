

import { convertToActivityFormData } from "./responseTypeUtils";
import { extractInfluencingFactors } from "./factorExtractionUtils";
import { debugLog } from "@/utils/debugLogger";

type FetchActivityResponseFn = (
  phase: string,
  step: string,
  activity: string
) => Promise<unknown>;

/**
 * Fetches factors from a specific location
 * @param fetchFn - The fetch function to use
 * @param phase - Phase name
 * @param step - Step name
 * @param activity - Activity name
 * @returns Array of factors or null if not found
 */
export const fetchFactorsFromLocation = async (
  fetchFn: FetchActivityResponseFn,
  phase: string,
  step: string,
  activity: string
): Promise<string[] | null> => {
  try {
    debugLog(`Checking ${phase}/${step}/${activity}`);
    const response = await fetchFn(phase, step, activity);

    if (response) {
      debugLog(`Found data in ${phase}/${step}/${activity}:`, response);

      // Handle string responses directly
      if (typeof response === 'string' && response.trim()) {
        return extractInfluencingFactors({ factors: response });
      }

      // Handle object responses
      if (typeof response === 'object' && response !== null) {
        // Log keys to help with debugging
        debugLog(`Keys in ${phase}/${step}/${activity} response:`, Object.keys(response));

        const typedResponse = convertToActivityFormData(response);
        const extractedFactors = extractInfluencingFactors(typedResponse);

        if (extractedFactors.length > 0) {
          debugLog(`Successfully extracted ${extractedFactors.length} factors from ${phase}/${step}/${activity}`);
          return extractedFactors;
        }
      }
    }
    return null;
  } catch {
    debugLog(`Failed to fetch from ${phase}/${step}/${activity}`);
    return null;
  }
};

/**
 * Attempts to fetch factors from multiple possible locations
 * @param fetchFn - The fetch function to use
 * @param locations - Array of locations to check
 * @returns The first set of factors found, or empty array if none
 */
export const fetchFactorsFromMultipleLocations = async (
  fetchFn: FetchActivityResponseFn,
  locations: Array<{ phase: string; step: string; activity: string }>
): Promise<string[]> => {
  debugLog(`Attempting to fetch factors from ${locations.length} potential locations`);

  for (const path of locations) {
    debugLog(`Trying path: ${path.phase}/${path.step}/${path.activity}`);
    const factors = await fetchFactorsFromLocation(fetchFn, path.phase, path.step, path.activity);
    if (factors && factors.length > 0) {
      debugLog(`Found ${factors.length} factors in ${path.phase}/${path.step}/${path.activity}`);
      return factors;
    }
  }

  debugLog("Could not find factors in any of the specified locations");
  return [];
};
