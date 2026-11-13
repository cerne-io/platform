/**
 * Shared utilities for project context processors
 */

// Common database/technical fields that should not be extracted as content
export const TECHNICAL_FIELDS = [
  'id',
  'selected_at',
  'updated_at',
  'created_at',
  'ar_project_id',
  'ar_phase_id',
  'ar_step_id',
  'ar_activity_id',
  'ar_response'
];

/**
 * Extracts a string from a potential localization object, prioritizing English.
 * Fallbacks to other languages if English is not present.
 * If input is a string, returns the string.
 */
export function extractLocalizedOrString(data: unknown): string | null {
  if (!data) return null;

  if (typeof data === 'string') {
    return data.trim().length > 0 ? data.trim() : null;
  }

  if (typeof data === 'object' && data !== null) {
    const dataObj = data as Record<string, unknown>;

    // Check if it looks like a translation object (keys are lang codes)
    // Common languages we might expect: en, es, fr, pt, etc.
    const hasEnglish = 'en' in dataObj && typeof dataObj['en'] === 'string';

    if (hasEnglish) {
      return (dataObj['en'] as string).trim();
    }

    // If it's an object with string values, just return the first one that is a string
    for (const [key, value] of Object.entries(dataObj)) {
      if (typeof value === 'string' && value.trim() && !TECHNICAL_FIELDS.includes(key)) {
        return value.trim();
      }
    }
  }

  return null;
}

/**
 * Checks if a key is a technical field that should be ignored
 */
export function isTechnicalField(key: string): boolean {
  return TECHNICAL_FIELDS.includes(key);
}
