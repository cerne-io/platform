
/**
 * Factors formatting module
 */

// Import the utility function at the top
import { formatFieldName } from '../utils/formattingUtils';

/**
 * Format factors (most important for slider questions)
 */
export const formatFactors = (rawData: Record<string, unknown>): string => {
  const text = '\n\nKEY FACTORS:\n';

  // Try primary factors location
  if (rawData.factors) {
    return formatFactorsData(text, rawData.factors);
  }

  // Try alternative factors locations
  const altFactorKeys = Object.keys(rawData).filter(key =>
    key.includes('factor') ||
    key.includes('_discover_factors') ||
    key.includes('influencing')
  );

  if (altFactorKeys.length > 0) {
    for (const key of altFactorKeys) {
      const formattedText = formatFactorsData(text, rawData[key]);
      if (formattedText !== text) {
        return formattedText;
      }
    }
  }

  return '';
};

/**
 * Extracts raw text from an unknown factor item (string or object)
 */
function extractFactorText(factor: unknown): string {
  if (typeof factor === 'string') return factor;
  if (typeof factor === 'object' && factor !== null) {
    const obj = factor as Record<string, unknown>;
    const text = obj.text || obj.factor || obj.name || obj.value;
    return typeof text === 'string' ? text : '';
  }
  return '';
}

/**
 * Formats an array of factors with a given prefix
 */
function formatFactorArray(factors: unknown[], prefix: string = 'Factor'): string {
  let text = '';
  factors.forEach((f, i) => {
    const factorText = extractFactorText(f);
    if (factorText) {
      text += `• ${prefix} ${i + 1}: ${factorText}\n`;
    }
  });
  return text;
}

/**
 * Format factors data from various possible structures
 */
export const formatFactorsData = (baseText: string, data: unknown): string => {
  if (!data) return '';

  if (typeof data === 'string') {
    return baseText + `• ${data}\n`;
  }

  if (Array.isArray(data)) {
    return baseText + formatFactorArray(data);
  }

  if (typeof data === 'object') {
    let text = baseText;
    const dataObj = data as Record<string, unknown>;

    // Check if it has a factors array
    if (Array.isArray(dataObj.factors)) {
      return baseText + formatFactorArray(dataObj.factors);
    }

    // Check for influencing_factors object structure
    if (dataObj.influencing_factors) {
      if (Array.isArray(dataObj.influencing_factors)) {
        return baseText + formatFactorArray(dataObj.influencing_factors);
      }
      
      if (typeof dataObj.influencing_factors === 'string') {
        const splitFactors = dataObj.influencing_factors.split(/,|;/);
        let validIndex = 0;
        for (const splitFactor of splitFactors) {
          const trimmed = splitFactor.trim();
          if (trimmed) {
            text += `• Factor ${validIndex + 1}: ${trimmed}\n`;
            validIndex++;
          }
        }
        return text;
      }
    }

    // Try to extract from any field that might contain factors
    let foundFactors = false;
    Object.entries(dataObj).forEach(([key, value]) => {
      if ((key.includes('factor') || key.includes('influence')) && value) {
        if (typeof value === 'string') {
          foundFactors = true;
          text += `• ${formatFieldName(key)}: ${value}\n`;
        } else if (Array.isArray(value)) {
          const formattedArray = formatFactorArray(value, formatFieldName(key));
          if (formattedArray) {
            foundFactors = true;
            text += formattedArray;
          }
        }
      }
    });

    return foundFactors ? text : '';
  }

  return '';
};
