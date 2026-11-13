import { debugError } from "@/utils/debugLogger";
/**
 * Shared formatting utility functions
 */

/**
 * Format a field name to be more readable
 */
export const formatFieldName = (name: string): string => {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
};

/**
 * Format an object's properties into readable text
 */
export const formatObject = (obj: Record<string, unknown>, indent: string = ''): string => {
  // Optimization: Use array push/join instead of string concatenation (+=)
  // to reduce memory overhead and intermediate string generation during deep object formatting
  const parts: string[] = [];

  try {
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'string' && value.trim()) {
        parts.push(`${indent}• ${formatFieldName(key)}: ${value}\n`);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        parts.push(`${indent}• ${formatFieldName(key)}:\n${formatObject(value as Record<string, unknown>, indent + '  ')}`);
      } else if (Array.isArray(value) && value.length > 0) {
        parts.push(`${indent}• ${formatFieldName(key)}:\n`);
        value.forEach((item, index) => {
          if (typeof item === 'string') {
            parts.push(`${indent}  • Item ${index + 1}: ${item}\n`);
          } else if (typeof item === 'object' && item !== null) {
            parts.push(`${indent}  • Item ${index + 1}:\n${formatObject(item as Record<string, unknown>, indent + '    ')}`);
          }
        });
      }
    });
  } catch (e) {
    debugError("Error formatting object:", e);
  }

  return parts.join('');
};
