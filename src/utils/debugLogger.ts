
/**
 * Global flag to enable/disable detailed debugging
 * Set to true to enable debugging for all users during development
 */
let FORCE_DEBUG: boolean = false;

// Global flag to track if user is superadmin
let IS_SUPER_ADMIN: boolean = false;

/**
 * Set the debug user role status
 * This should be called from a component that has access to the user role hook
 */
export const setDebugUserRole = (isSuperAdmin: boolean): void => {
  IS_SUPER_ADMIN = isSuperAdmin;
};

/**
 * Check if debug logging is enabled
 * @returns boolean True if user is superadmin or force debug is enabled
 */
export const isDebugEnabled = (): boolean => {
  return IS_SUPER_ADMIN || FORCE_DEBUG;
};

/**
 * Alternative check for debugging when hooks can't be used (non-component context)
 * @param forceSuperadminCheck - When true, will default to false if superadmin can't be determined
 * @returns boolean
 */
export const canDebugLog = (forceSuperadminCheck = false): boolean => {
  if (FORCE_DEBUG) return true;

  // In non-component contexts, we can't use hooks directly
  // Return based on the environment and the forceSuperadminCheck parameter
  if (forceSuperadminCheck) {
    return false; // Default to no debugging outside component context if check is forced
  }

  // Default to false to reduce noise, unless FORCE_DEBUG is enabled
  return false;
};

import { sanitizeForLog } from "@/utils/logSanitizer";

const isDevelopment = Boolean(import.meta.env?.DEV || process.env.NODE_ENV === 'development');

/**
 * Debug log - only outputs if user is a superadmin
 * Use like regular console.log
 */
export const debugLog = (...args: unknown[]): void => {
  if (isDebugEnabled()) {
    if (isDevelopment) {
      console.log(...args);
    } else {
      console.log(...args.map(arg => sanitizeForLog(arg)));
    }
  }
};

/**
 * Debug warning - only outputs if user is a superadmin
 * Use like regular console.warn
 */
export const debugWarn = (...args: unknown[]): void => {
  if (isDebugEnabled()) {
    if (isDevelopment) {
      console.warn(...args);
    } else {
      console.warn(...args.map(arg => sanitizeForLog(arg)));
    }
  }
};

/**
 * Debug error - only outputs if user is a superadmin
 * Use like regular console.error
 */
export const debugError = (...args: unknown[]): void => {
  if (isDebugEnabled()) {
    if (isDevelopment) {
      console.error(...args);
    } else {
      console.error(...args.map(arg => sanitizeForLog(arg)));
    }
  }
};

/**
 * Debug info - only outputs if user is a superadmin
 * Use like regular console.info
 */
export const debugInfo = (...args: unknown[]): void => {
  if (isDebugEnabled()) {
    if (isDevelopment) {
      console.info(...args);
    } else {
      console.info(...args.map(arg => sanitizeForLog(arg)));
    }
  }
};

/**
 * Debug group - only creates a group if user is a superadmin
 * Use like regular console.group
 */
export const debugGroup = (label: string): void => {
  if (isDebugEnabled()) {
    console.group(label);
  }
};

/**
 * Debug group end - only ends a group if user is a superadmin
 * Use like regular console.groupEnd
 */
export const debugGroupEnd = (): void => {
  if (isDebugEnabled()) {
    console.groupEnd();
  }
};

/**
 * Debug trace - only outputs if user is a superadmin
 * Use like regular console.trace
 */
export const debugTrace = (...args: unknown[]): void => {
  if (isDebugEnabled()) {
    console.trace(...args);
  }
};

/**
 * Force enable debug logging regardless of user role
 * Primarily for development use
 */
export const forceEnableDebug = (enable = true): void => {
  FORCE_DEBUG = enable;
};

/**
 * Helper to create contextual debug logger
 * @param context - The context name to prefix logs with
 */
export const createDebugLogger = (context: string) => {
  return {
    log: (...args: unknown[]) => debugLog(`[${context}]`, ...args),
    warn: (...args: unknown[]) => debugWarn(`[${context}]`, ...args),
    error: (...args: unknown[]) => debugError(`[${context}]`, ...args),
    info: (...args: unknown[]) => debugInfo(`[${context}]`, ...args),
    group: (label: string) => debugGroup(`[${context}] ${label}`),
    groupEnd: debugGroupEnd,
    trace: (...args: unknown[]) => debugTrace(`[${context}]`, ...args)
  };
};

/**
 * Non-component context version - for use in services and other non-component code
 */
export const createServiceDebugLogger = (context: string, forceCheck = false) => {
  return {
    log: (...args: unknown[]) => {
      if (canDebugLog(forceCheck)) console.log(`[${context}]`, ...args);
    },
    warn: (...args: unknown[]) => {
      if (canDebugLog(forceCheck)) console.warn(`[${context}]`, ...args);
    },
    error: (...args: unknown[]) => {
      if (canDebugLog(forceCheck)) console.error(`[${context}]`, ...args);
    },
    info: (...args: unknown[]) => {
      if (canDebugLog(forceCheck)) console.info(`[${context}]`, ...args);
    }
  };
};
