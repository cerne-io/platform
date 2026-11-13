import { ErrorSeverity, handleError } from "./errorHandling";
import { debugError, debugInfo } from "@/utils/debugLogger";

const SENSITIVE_FIELDS = ['storyText', 'story', 'additionalComments', 'narrative', 'text', 'originalError'];

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_FIELDS.includes(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Types for error analytics
export interface ErrorAnalyticsData {
  errorId: string;
  message: string;
  stack?: string;
  componentName?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: number;
  metadata?: Record<string, unknown>;
  userAction?: string;
  source: ErrorSource;
}

export type ErrorCategory =
  | 'api'
  | 'auth'
  | 'ui'
  | 'data'
  | 'network'
  | 'visualization'
  | 'input'
  | 'storage'
  | 'performance'
  | 'ai'
  | 'unknown';

export type ErrorSource =
  | 'client'
  | 'server'
  | 'network'
  | 'external';

export type ErrorPriority = 'critical' | 'high' | 'medium' | 'low';

// In-memory store for errors (would be replaced with persistent storage in production)
const errorStore: ErrorAnalyticsData[] = [];

/**
 * Generates a unique ID for each error
 */
function generateErrorId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

const CATEGORY_MATCHERS: Array<{ category: ErrorCategory; keywords: string[] }> = [
  { category: 'network', keywords: ['network', 'fetch', 'http'] },
  { category: 'auth', keywords: ['auth', 'login', 'permission'] },
  { category: 'ui', keywords: ['render', 'component'] },
  { category: 'data', keywords: ['data', 'query', 'supabase'] },
  { category: 'visualization', keywords: ['chart', 'd3', 'visualization'] },
  { category: 'storage', keywords: ['storage', 'save', 'cache'] },
  { category: 'input', keywords: ['input', 'validation', 'form'] },
  { category: 'performance', keywords: ['performance', 'slow', 'timeout'] },
  { category: 'ai', keywords: ['ai', 'gpt', 'claude', 'llm'] }
];

/**
 * Determines the category of an error based on its properties and context
 */
export function categorizeError(error: unknown, context?: Record<string, unknown>): ErrorCategory {
  if (!error) return 'unknown';

  if (context?.source === 'react') return 'ui';

  const errorStr = String(error).toLowerCase();
  
  for (const matcher of CATEGORY_MATCHERS) {
    if (matcher.keywords.some(keyword => errorStr.includes(keyword))) {
      return matcher.category;
    }
  }

  return 'unknown';
}

/**
 * Determines the priority of an error based on its severity and category
 */
export function prioritizeError(
  severity: ErrorSeverity,
  category: ErrorCategory
): ErrorPriority {
  // Critical errors
  if (severity === 'error') {
    if (category === 'auth' || category === 'data' || category === 'network') {
      return 'critical';
    }
    return 'high';
  }

  // Warning level errors
  if (severity === 'warning') {
    if (category === 'network' || category === 'data') {
      return 'high';
    }
    return 'medium';
  }

  // Info level errors
  return 'low';
}

function extractFromObject(errObj: Record<string, unknown>) {
  const messageFields = ['message', 'error_description', 'error', 'msg', 'statusText'];
  let extractedMessage = "";
  
  for (const field of messageFields) {
    if (typeof errObj[field] === "string" && errObj[field]) {
      extractedMessage = errObj[field] as string;
      break;
    }
  }

  const stack = typeof errObj.stack === "string" ? errObj.stack : undefined;
  const code = typeof errObj.code === "string" ? errObj.code : (typeof errObj.status === "number" ? String(errObj.status) : undefined);
  const details = typeof errObj.details === "string" ? errObj.details : (typeof errObj.hint === "string" ? errObj.hint : undefined);

  if (extractedMessage) return { message: extractedMessage, stack, code, details };

  try {
    const jsonStr = JSON.stringify(errObj);
    if (jsonStr && jsonStr !== "{}") return { message: jsonStr, stack, code, details };
  } catch {
    // Fallback
  }

  return { message: String(errObj), stack, code, details };
}

/**
 * Robustly extracts message, stack, code, and details from any error object, string, or unknown reason
 */
export function extractErrorInfo(error: unknown): {
  message: string;
  stack?: string;
  code?: string;
  details?: string;
} {
  if (!error) return { message: "Unknown error" };
  if (error instanceof Error) return { message: error.message || error.name || "Error", stack: error.stack };
  if (typeof error === "string") return { message: error };
  if (typeof error === "object") return extractFromObject(error as Record<string, unknown>);
  return { message: String(error) };
}

/**
 * Logs an error to the centralized error store and optionally reports it
 */
export function logError(
  error: unknown,
  message: string = "An error occurred",
  options: {
    severity?: ErrorSeverity;
    componentName?: string;
    category?: ErrorCategory;
    metadata?: Record<string, unknown>;
    userAction?: string;
    source?: ErrorSource;
    report?: boolean;
  } = {}
): ErrorAnalyticsData {
  const {
    severity = 'error',
    componentName,
    metadata = {},
    userAction,
    source = 'client',
    report = true,
  } = options;

  // Robustly determine error details
  const extracted = extractErrorInfo(error);
  const errorMessage = extracted.message;
  const stack = extracted.stack;

  // Determine category (use provided or auto-categorize)
  const category = options.category || categorizeError(error, { componentName, ...metadata });

  // Determine priority
  const priority = prioritizeError(severity, category);

  // Preserve both the contextual wrapper and the underlying error message
  const combinedMessage =
    message && errorMessage && message !== errorMessage && message !== "An error occurred"
      ? `${message}: ${errorMessage}`
      : errorMessage || message;

  // Create error analytics object
  const errorData: ErrorAnalyticsData = {
    errorId: generateErrorId(),
    message: combinedMessage,
    stack,
    componentName,
    severity,
    category,
    timestamp: Date.now(),
    metadata: {
      ...metadata,
      priority,
      originalError: errorMessage,
      ...(extracted.code ? { errorCode: extracted.code } : {}),
      ...(extracted.details ? { errorDetails: extracted.details } : {}),
    },
    userAction,
    source,
  };

  // Store error in memory
  errorStore.push(errorData);

  // Log to console for development
  if (process.env.NODE_ENV !== 'production') {
    console.group(`[${severity.toUpperCase()}] ${combinedMessage}`);
    debugError(error);
    console.info(`Category: ${category}, Priority: ${priority}`);
    if (metadata && Object.keys(metadata).length) {
      console.info('Context:', metadata);
    }
    console.groupEnd();
  }

  // Report to external service if needed
  if (report) {
    void reportError(errorData);
  }

  return errorData;
}

/**
 * Reports an error to local debug logs (telemetry disabled in OSS edition)
 */
export async function reportError(errorData: ErrorAnalyticsData): Promise<void> {
  const sanitizedData = {
    ...errorData,
    metadata: errorData.metadata ? sanitizeMetadata(errorData.metadata) : undefined
  };
  debugInfo('[Error Report]', JSON.stringify(sanitizedData));
}

/**
 * Retrieves all logged errors (for admin dashboards, etc)
 */
export function getLoggedErrors(): ErrorAnalyticsData[] {
  return [...errorStore];
}

/**
 * Clears the error store (for testing/development)
 */
export function clearErrorStore(): void {
  errorStore.length = 0;
}

function processError(error: unknown, componentName: string, options: {
  category?: ErrorCategory;
  metadata?: Record<string, unknown>;
  severity?: ErrorSeverity;
  showToast?: boolean;
  logToConsole?: boolean;
}) {
  const errorData = logError(error, `Error in ${componentName}`, {
    componentName,
    category: options.category,
    metadata: options.metadata,
    severity: options.severity || 'error',
  });

  handleError(error, errorData.message, {
    showToast: options.showToast ?? true,
    logToConsole: options.logToConsole ?? true,
    severity: errorData.severity,
    context: { errorId: errorData.errorId, ...options.metadata },
  });

  throw error;
}

/**
 * Creates an error handler that logs errors before handling them
 */
export function createLoggingErrorHandler(
  componentName: string,
  options: {
    category?: ErrorCategory;
    metadata?: Record<string, unknown>;
    severity?: ErrorSeverity;
    showToast?: boolean;
    logToConsole?: boolean;
  } = {}
) {
  return (fn: (...args: unknown[]) => unknown) => {
    return (...args: unknown[]) => {
      try {
        const result = fn(...args);

        if (result instanceof Promise) {
          return result.catch(error => processError(error, componentName, options));
        }

        return result;
      } catch (error) {
        return processError(error, componentName, options);
      }
    };
  };
}
