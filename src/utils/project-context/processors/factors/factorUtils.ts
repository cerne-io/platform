
/**
 * Utility functions for processing factors
 */

/**
 * Extract an array of factors from a string by splitting on common delimiters
 */
export function extractFactorArray(factorText: string): string[] {
  if (!factorText || typeof factorText !== 'string') {
    return [];
  }

  return factorText
    .split(/\n|•|⦁|·|●|\*|-/)
    .map(f => f.trim())
    .filter(f => f && f.length > 3);
}

/**
 * Check if a string contains factor-related keywords
 */
export function isFactorRelated(text: string): boolean {
  const factorKeywords = ['factor', 'influence', 'motivat', 'drive', 'barrier', 'affect'];
  return factorKeywords.some(keyword => text.toLowerCase().includes(keyword));
}

/**
 * Format a factor string for display
 */
export function formatFactorForDisplay(factor: string): string {
  // Remove leading bullet points or numbers
  const cleaned = factor.replace(/^[\s•⦁·●*\d.-]+/g, '').trim();

  // Capitalize first letter if it's lowercase
  if (cleaned.length > 0 && cleaned[0].toLowerCase() === cleaned[0]) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}
