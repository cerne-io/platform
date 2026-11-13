/**
 * Data sanitization utility for application loggers.
 * Deeply sanitizes sensitive data (tokens, secrets, PII, narrative content)
 * to prevent leaking into browser consoles or monitoring streams.
 */

const isDevelopment = Boolean(import.meta.env?.DEV || import.meta.env?.MODE === 'development');

const SENSITIVE_KEYS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'password',
  'secret',
  'authorization',
  'email',
  'session',
  'bridge_token',
  'storyText',
  'story',
  'narrative',
  'additionalComments'
]);

/**
 * Deeply sanitizes data before logging to prevent leaking credentials,
 * tokens, or participant narratives into browser consoles or session replays.
 */
export const sanitizeForLog = (data: unknown, depth = 0): unknown => {
  if (depth > 4) return '[NESTED_OBJECT]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Redact bearer tokens or JWT strings
    if (data.startsWith('Bearer ') || /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(data)) {
      return '[REDACTED_TOKEN]';
    }
    return data;
  }

  if (typeof data !== 'object') return data;

  if (data instanceof Error) {
    return isDevelopment
      ? { name: data.name, message: data.message, stack: data.stack }
      : { name: data.name, message: data.message };
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLog(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeForLog(value, depth + 1);
    }
  }
  return sanitized;
};
