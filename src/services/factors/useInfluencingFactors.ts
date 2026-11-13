
import { useActivityResponses } from "@/hooks/useActivityResponses";
import { extractInfluencingFactors } from "./factorExtractionUtils";
import { fetchFactorsFromMultipleLocations } from "./factorFetchingService";
import { checkPrimaryFactorSource, checkTopicFactorSources, getLegacyPaths } from "./factorSourceHandler";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { debugLog, debugError } from "@/utils/debugLogger";

/**
 * Custom hook to fetch influencing factors from project details
 * @param projectId - The project ID
 * @returns Object with getInfluencingFactors function and loading state
 */
export const useInfluencingFactors = (projectId: string) => {
  const { fetchActivityResponse } = useActivityResponses(projectId);
  const [isLoading, setIsLoading] = useState(false);

  const getInfluencingFactors = async (forceRefresh = false): Promise<string[]> => {
    setIsLoading(true);
    try {
      if (!projectId) {
        debugLog("No project ID provided");
        return [];
      }

      debugLog(`Fetching influencing factors for project: ${projectId}${forceRefresh ? ' (forced refresh)' : ''}`);

      // Step 1: Check the primary factor source (define/discover/factors)
      debugLog("Step 1: Checking primary factor source (define/discover/factors)");
      const primaryFactors = await checkPrimaryFactorSource(fetchActivityResponse);
      if (primaryFactors && primaryFactors.length > 0) {
        debugLog("Found factors in primary location:", primaryFactors);
        return primaryFactors;
      }

      // Step 2: Check the topic-related sources
      debugLog("Step 2: Checking topic-related sources");
      const topicFactors = await checkTopicFactorSources(fetchActivityResponse);
      if (topicFactors && topicFactors.length > 0) {
        debugLog("Found factors in topic-related sources:", topicFactors);
        return topicFactors;
      }

      // Step 3: Try a direct check of the define/discover/factors location with fallbacks
      debugLog("Step 3: Trying direct check of define/discover/factors with more fallbacks");
      try {
        // Try with additional variations of the activity ID
        const variations = [
          { phase: 'define', step: 'discover', activity: 'factors' },
          { phase: 'define', step: 'discover', activity: 'influencing_factors' },
          { phase: 'define', step: 'discover', activity: 'influencing-factors' },
          { phase: 'define', step: 'discover', activity: 'key-factors' },
          { phase: 'define', step: 'factors', activity: 'list' },
          { phase: 'define', step: 'discover', activity: 'project-factors' }
        ];

        for (const variation of variations) {
          const response = await fetchActivityResponse(
            variation.phase,
            variation.step,
            variation.activity
          );

          if (response) {
            debugLog(`Found response at ${variation.phase}/${variation.step}/${variation.activity}:`, response);

            if (typeof response === 'string') {
              const extractedFactors = extractInfluencingFactors({ factors: response });
              if (extractedFactors.length > 0) {
                debugLog("Successfully extracted factors:", extractedFactors);
                return extractedFactors;
              }
            } else if (typeof response === 'object' && response !== null) {
              // Log the keys to help with debugging
              debugLog("Response keys:", Object.keys(response));

              const extractedFactors = extractInfluencingFactors(response as Record<string, unknown>);
              if (extractedFactors.length > 0) {
                debugLog("Successfully extracted factors from object:", extractedFactors);
                return extractedFactors;
              }
            }
          }
        }
      } catch (error) {
        debugLog("Error in Step 3:", error);
      }

      // Step 4: Check legacy paths as a last resort
      debugLog("Step 4: Checking legacy paths");
      const legacyPaths = getLegacyPaths();
      const legacyFactors = await fetchFactorsFromMultipleLocations(
        fetchActivityResponse,
        legacyPaths
      );

      if (legacyFactors.length > 0) {
        debugLog("Found factors in legacy paths:", legacyFactors);
        return legacyFactors;
      }

      // If forceRefresh, try one more desperate attempt with full project context
      if (forceRefresh) {
        debugLog("Step 5: Attempting to extract factors from any activity responses");

        // Try to find any content that might contain factors in key activities
        const possibleContentSources = [
          { phase: 'context', step: 'project-info', activity: 'project-description' },
          { phase: 'context', step: 'project', activity: 'scope' },
          { phase: 'define', step: 'topic', activity: 'investigate' },
          { phase: 'define', step: 'discover', activity: 'experiences' }
        ];

        for (const source of possibleContentSources) {
          try {
            const content = await fetchActivityResponse(source.phase, source.step, source.activity);
            if (content && (typeof content === 'string' || typeof content === 'object')) {
              debugLog(`Trying to extract factors from ${source.phase}/${source.step}/${source.activity}`);
              const extractedFactors = extractInfluencingFactors(
                typeof content === 'string' ? { text: content } : content as Record<string, unknown>
              );

              if (extractedFactors.length > 0) {
                debugLog("Found potential factors in content:", extractedFactors);
                return extractedFactors;
              }
            }
          } catch (error) {
            debugLog(`Error checking ${source.phase}/${source.step}/${source.activity}:`, error);
          }
        }
      }

      debugLog("Could not find influencing factors in any location");
      if (forceRefresh) {
        toast({
          title: "No factors found",
          description: "Please add influencing factors in the Define phase under Discover → Factors.",
          variant: "destructive"
        });
      }
      return [];
    } catch (error) {
      debugError("Error fetching influencing factors:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return { getInfluencingFactors, isLoading };
};
