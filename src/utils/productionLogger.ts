/**
 * Production-safe logging utilities
 * Only logs verbose statements in development, sanitizes sensitive data in production
 */

const isDevelopment = Boolean(import.meta.env.DEV || import.meta.env.MODE === 'development');

import { isDebugEnabled } from "@/utils/debugLogger";
import { sanitizeForLog } from "@/utils/logSanitizer";

export { sanitizeForLog };

/**
 * Log in development or in production for superadmin users
 */
export const devLog = (...args: unknown[]): void => {
  if (isDevelopment) {
    console.log(...args);
  } else if (isDebugEnabled()) {
    console.log(...args.map(arg => sanitizeForLog(arg)));
  }
};

/**
 * Log warnings in development or in production for superadmin users
 */
export const devWarn = (...args: unknown[]): void => {
  if (isDevelopment) {
    console.warn(...args);
  } else if (isDebugEnabled()) {
    console.warn(...args.map(arg => sanitizeForLog(arg)));
  }
};

/**
 * Log info in development or in production for superadmin users
 */
export const devInfo = (...args: unknown[]): void => {
  if (isDevelopment) {
    console.info(...args);
  } else if (isDebugEnabled()) {
    console.info(...args.map(arg => sanitizeForLog(arg)));
  }
};

/**
 * Safe warnings - always emitted but arguments sanitized in production
 */
export const safeWarn = (...args: unknown[]): void => {
  if (isDevelopment) {
    console.warn(...args);
  } else {
    console.warn(...args.map(arg => sanitizeForLog(arg)));
  }
};

/**
 * Log errors - always allowed but sanitized in production
 */
export const safeError = (message: string, error?: unknown): void => {
  if (isDevelopment) {
    if (error !== undefined) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  } else {
    // In production, log message and sanitized error summary (no stacks/credentials)
    if (error instanceof Error) {
      console.error(message, error.message);
    } else if (error !== undefined) {
      console.error(message, sanitizeForLog(error));
    } else {
      console.error(message);
    }
  }
};

/**
 * Create a contextual logger that prefixes all logs with a context name
 */
export const createContextLogger = (context: string) => {
  const prefixArgs = (args: unknown[]): unknown[] => {
    if (args.length === 0) return [`[${context}]`];
    if (typeof args[0] === 'string') {
      return [`[${context}] ${args[0]}`, ...args.slice(1)];
    }
    return [`[${context}]`, ...args];
  };

  return {
    log: (...args: unknown[]) => devLog(...prefixArgs(args)),
    info: (...args: unknown[]) => devInfo(...prefixArgs(args)),
    warn: (...args: unknown[]) => safeWarn(...prefixArgs(args)),
    error: (message: string, error?: unknown) => safeError(`[${context}] ${message}`, error)
  };
};
