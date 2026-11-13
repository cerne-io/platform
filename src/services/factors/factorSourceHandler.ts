

import { extractInfluencingFactors } from "./factorExtractionUtils";
import { convertToActivityFormData } from "./responseTypeUtils";
import { fetchFactorsFromLocation } from "./factorFetchingService";
import { debugLog } from "@/utils/debugLogger";

type FetchActivityResponseFn = (
  phase: string,
  step: string,
  activity: string
) => Promise<unknown>;

/**
 * Check the primary factor source (define/discover/factors)
 * @param fetchActivityResponse - The fetch function to use
 * @returns Array of factors or null if not found
 */
export const checkPrimaryFactorSource = async (
  fetchActivityResponse: FetchActivityResponseFn
): Promise<string[] | null> => {
  try {
    debugLog("Checking 'define/discover/factors' activity");
    const factorsResponse = await fetchActivityResponse(
      'define',
      'discover',
      'factors'
    );

    if (factorsResponse) {
      debugLog("Found factors activity response:", factorsResponse);

      if (typeof factorsResponse === 'string' && factorsResponse.trim()) {
        return extractInfluencingFactors({ factors: factorsResponse });
      }

      if (typeof factorsResponse === 'object' && factorsResponse !== null) {
        // Extract 'factors' or 'influencing_factors' property if it exists
        const responseObj = factorsResponse as Record<string, unknown>;
        if ('factors' in responseObj && typeof responseObj.factors === 'string') {
          return extractInfluencingFactors({ factors: responseObj.factors as string });
        }

        // Log keys to help debug
        debugLog("Keys in factors response:", Object.keys(responseObj));

        // Try the entire object as it might have other relevant fields
        const typedResponse = convertToActivityFormData(factorsResponse);
        return extractInfluencingFactors(typedResponse);
      }
    }
    return null;
  } catch (error) {
    debugLog("No direct factors found in define/discover/factors", error);
    return null;
  }
};

/**
 * Check topic-related sources for factors
 * @param fetchActivityResponse - The fetch function to use
 * @returns Array of factors or null if not found
 */
export const checkTopicFactorSources = async (
  fetchActivityResponse: FetchActivityResponseFn
): Promise<string[] | null> => {
  // Check the define/topic/investigate activity
  const topicFactors = await fetchFactorsFromLocation(
    fetchActivityResponse,
    'define',
    'topic',
    'investigate'
  );

  if (topicFactors && topicFactors.length > 0) {
    return topicFactors;
  }

  // Check the define/topic/focus activity
  const focusFactors = await fetchFactorsFromLocation(
    fetchActivityResponse,
    'define',
    'topic',
    'focus'
  );

  if (focusFactors && focusFactors.length > 0) {
    return focusFactors;
  }

  // Try the specific factors section path
  const specificFactors = await fetchFactorsFromLocation(
    fetchActivityResponse,
    'define',
    'factors',
    'influencing-factors'
  );

  if (specificFactors && specificFactors.length > 0) {
    return specificFactors;
  }

  // Check additional locations for factors
  const additionalLocations = [
    { phase: 'define', step: 'discover', activity: 'key-factors' },
    { phase: 'define', step: 'discover', activity: 'research' },
    { phase: 'define', step: 'project', activity: 'details' },
    { phase: 'context', step: 'project', activity: 'scope' }
  ];

  for (const location of additionalLocations) {
    const factors = await fetchFactorsFromLocation(
      fetchActivityResponse,
      location.phase,
      location.step,
      location.activity
    );

    if (factors && factors.length > 0) {
      return factors;
    }
  }

  return null;
};

/**
 * Get all potential legacy paths for factors
 * @returns Array of path objects with phase, step, and activity
 */
export const getLegacyPaths = (): Array<{ phase: string; step: string; activity: string }> => {
  return [
    // Standard paths
    { phase: 'define', step: 'discover', activity: 'influencing-factors' },
    { phase: 'define', step: 'factors', activity: 'factors' },
    { phase: 'planning', step: 'discover', activity: 'factors' },
    { phase: 'planning', step: 'project-planning', activity: 'project-details' },
    { phase: 'planning', step: 'project-foundation', activity: 'project-details' },
    { phase: 'planning', step: 'project-setup', activity: 'project-details' },
    { phase: 'planning', step: 'project-planning', activity: 'project-goals' },
    { phase: 'planning', step: 'topic-planning', activity: 'describe-topics' },

    // Additional paths to check
    { phase: 'define', step: 'project', activity: 'details' },
    { phase: 'define', step: 'project-planning', activity: 'project-details' },
    { phase: 'context', step: 'project', activity: 'scope' },
    { phase: 'context', step: 'project', activity: 'goals' },
    { phase: 'context', step: 'project-info', activity: 'project-description' },
    { phase: 'define', step: 'topic', activity: 'research' },
    { phase: 'define', step: 'topic', activity: 'themes' }
  ];
};
