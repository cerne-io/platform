

import { debugLog } from "@/utils/debugLogger";

/**
 * Extracts influencing factors from project details
 * @param projectDetailsResponse - The response from project-details activity
 * @returns Array of influencing factors (strings)
 */
export const extractInfluencingFactors = (
  projectDetailsResponse: Record<string, unknown> | null,
): string[] => {
  if (!projectDetailsResponse || typeof projectDetailsResponse !== "object") {
    debugLog("No project details found or invalid format");
    return [];
  }

  // Log the entire response to help with debugging
  debugLog("Project details response:", projectDetailsResponse);

  // Expanded list of possible field names to check for factors
  const possibleFieldNames = [
    "influencing_factors",
    "influencingFactors",
    "factors",
    "influences",
    "discovery_goal",
    "project_focus",
    "hope_to_discover",
    "investigate",
    "focus",
    "experiences",
    "factors_influencing",
    "factors_text",
    "text",
    // Add more potential field names
    "key_factors",
    "important_factors",
    "project_factors",
    "research_factors",
    "discovery_factors",
    "insights",
    "themes",
    "areas_of_interest",
    "investigation_areas",
    "considerations",
  ];

  let influencingFactorsText = "";

  // Try to find the field containing factors
  for (const fieldName of possibleFieldNames) {
    if (
      fieldName in projectDetailsResponse &&
      typeof projectDetailsResponse[fieldName] === "string" &&
      projectDetailsResponse[fieldName].trim()
    ) {
      influencingFactorsText = projectDetailsResponse[fieldName] as string;
      debugLog(
        `Found influencing factors in '${fieldName}' field:`,
        influencingFactorsText,
      );
      break;
    }
  }

  // If we still haven't found factors, try to look for it in nested objects
  if (!influencingFactorsText) {
    for (const key in projectDetailsResponse) {
      const value = projectDetailsResponse[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const valObj = value as Record<string, unknown>;
        for (const fieldName of possibleFieldNames) {
          if (
            fieldName in valObj &&
            typeof valObj[fieldName] === "string" &&
            (valObj[fieldName] as string).trim()
          ) {
            influencingFactorsText = valObj[fieldName] as string;
            debugLog(
              `Found influencing factors in nested object '${key}.${fieldName}':`,
              influencingFactorsText,
            );
            break;
          }
        }
        if (influencingFactorsText) break;
      }
    }
  }

  // Check for factors in any string field with specific keywords
  if (!influencingFactorsText) {
    for (const key in projectDetailsResponse) {
      if (typeof projectDetailsResponse[key] === "string") {
        // Optimization: Hoist invariant toLowerCase()
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes("factor") ||
          lowerKey.includes("influence") ||
          lowerKey.includes("consider") ||
          lowerKey.includes("aspect")
        ) {
          influencingFactorsText = projectDetailsResponse[key] as string;
          debugLog(
            `Found potential factors in field '${key}':`,
            influencingFactorsText,
          );
          break;
        }
      }
    }
  }

  if (!influencingFactorsText) {
    debugLog("No influencing factors found in any expected fields");
    return [];
  }

  // Improved splitting logic to handle various formats
  // Split by various delimiters: commas, new lines, bullet points, numbers, semicolons
  const splitParts = influencingFactorsText.split(/[,\n•;]|\d+\.\s*|\*\s*/);
  const rawFactors: string[] = [];

  // Optimization: Use a pre-computed Set for O(1) lookups instead of Array.prototype.includes
  const excludedWords = new Set([
    "and",
    "or",
    "the",
    "a",
    "an",
    "in",
    "on",
    "at",
    "by",
    "for",
    "with",
    "to",
  ]);

  // Optimization: Combine .map() and .filter() into a single for loop
  for (let i = 0; i < splitParts.length; i++) {
    const factor = splitParts[i].trim();
    if (factor.length > 0 && !excludedWords.has(factor.toLowerCase())) {
      rawFactors.push(factor);
    }
  }

  // Further cleanup and deduplication
  const uniqueFactors = [...new Set(rawFactors)];

  // Order by length (often longer descriptions are more meaningful)
  const sortedFactors = uniqueFactors
    .sort((a, b) => {
      // First sort by length - prioritize moderate length factors (not too short, not too long)
      const aLength = a.length;
      const bLength = b.length;

      if (aLength < 3) return 1; // Very short factors go last
      if (bLength < 3) return -1;

      // Ideal length is between 5-40 characters
      if (aLength >= 5 && aLength <= 40 && (bLength < 5 || bLength > 40))
        return -1;
      if (bLength >= 5 && bLength <= 40 && (aLength < 5 || aLength > 40))
        return 1;

      // Otherwise sort by length descending (longer factors first)
      return bLength - aLength;
    })
    .slice(0, 8); // Get top 8 factors so we have more to choose from

  debugLog("Extracted and sorted factors:", sortedFactors);

  return sortedFactors;
};
