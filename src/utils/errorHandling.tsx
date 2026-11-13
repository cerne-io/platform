import React from 'react';
import { toast } from "@/hooks/toast";
import { logError, categorizeError, ErrorCategory } from "./errorLogging";
import { debugLog, debugError, debugWarn } from "@/utils/debugLogger";

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'success' | 'silent';

interface ErrorOptions {
  // Whether to show a toast notification
  showToast?: boolean;
  // Custom title for the toast notification
  title?: string;
  // Whether to log to console
  logToConsole?: boolean;
  // The severity level of the error
  severity?: ErrorSeverity;
  // Additional context to include in logs
  context?: Record<string, unknown>;
  // Optional callback to execute after handling the error
  onError?: (error: unknown) => void;
  // Whether to log to centralized error logging system
  logToSystem?: boolean;
  // Error category for analytics
  category?: ErrorCategory;
  // Component name where error occurred
  componentName?: string;
  // User action that triggered the error
  userAction?: string;
  // Whether to report to monitoring services
  report?: boolean;
  // Recovery action for user to try
  recoveryAction?: () => void;
  // Text to show for recovery action
  recoveryActionText?: string;
  // Suggestions to help user resolve the issue
  suggestions?: string[];
}

const defaultOptions: ErrorOptions = {
  showToast: true,
  logToConsole: true,
  severity: 'error',
  logToSystem: true,
  report: process.env.NODE_ENV === 'production',
};

// Map ErrorSeverity to toast variant
const severityToVariantMap = {
  'error': 'destructive',
  'warning': 'warning',
  'info': 'info',
  'success': 'success',
  'silent': 'default'
} as const;

/**
 * Generate helpful suggestions based on error type and context
 */
function generateSuggestions(error: unknown, category?: ErrorCategory): string[] {
  const suggestions: string[] = [];
  const errorStr = String(error);

  // Default suggestion
  suggestions.push("Try refreshing the page.");

  if (category === 'network' || errorStr.includes('network') || errorStr.includes('fetch')) {
    suggestions.push("Check your internet connection.");
    suggestions.push("The server might be temporarily unavailable.");
  }

  if (category === 'auth' || errorStr.includes('auth') || errorStr.includes('permission')) {
    suggestions.push("Try logging out and logging back in.");
    suggestions.push("Your session might have expired.");
  }

  if (category === 'data' || errorStr.includes('data')) {
    suggestions.push("Try again in a few moments.");
    suggestions.push("The data might be temporarily unavailable.");
  }

  if (category === 'input' || errorStr.includes('validation')) {
    suggestions.push("Check your input values for any errors.");
    suggestions.push("Make sure all required fields are filled correctly.");
  }

  return suggestions;
}

/**
 * Handle an error with standardized logging and user feedback
 */
export function handleError(
  error: unknown,
  message: string = "An unexpected error occurred",
  options: ErrorOptions = {}
) {
  const opts = { ...defaultOptions, ...options };
  const {
    showToast,
    logToConsole,
    severity,
    context,
    onError,
    title,
    logToSystem,
    category,
    componentName,
    userAction,
    report,
    recoveryAction,
    recoveryActionText,
    suggestions: providedSuggestions
  } = opts;

  // Determine error details
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCategory = category || categorizeError(error, context);

  // Generate suggestions if not provided
  const suggestions = providedSuggestions || generateSuggestions(error, errorCategory);

  // Log to centralized system if enabled
  if (logToSystem) {
    logError(error, message, {
      severity,
      componentName,
      category: errorCategory,
      metadata: {
        ...context,
        suggestions,
        recoveryAvailable: !!recoveryAction
      },
      userAction,
      report
    });
  }

  // Log to console if enabled
  if (logToConsole) {
    const contextStr = context ? `\nContext: ${JSON.stringify(context)}` : '';
    const suggestionsStr = suggestions.length > 0 ? `\nSuggestions: ${suggestions.join(', ')}` : '';

    if (severity === 'error') {
      debugError(`${message}: ${errorMessage}${contextStr}${suggestionsStr}`, error);
    } else if (severity === 'warning') {
      debugWarn(`${message}: ${errorMessage}${contextStr}${suggestionsStr}`, error);
    } else if (severity === 'success') {
      debugLog(`${message}: ${errorMessage}${contextStr}${suggestionsStr}`, error);
    } else {
      debugLog(`${message}: ${errorMessage}${contextStr}${suggestionsStr}`, error);
    }
  }

  // Show toast notification if enabled
  if (showToast && severity !== 'silent') {
    const variant = severityToVariantMap[severity || 'error'];

    let toastAction;
    if (recoveryAction) {
      toastAction = (
        <button
          onClick={recoveryAction}
          className="px-3 py-1 rounded-md text-sm bg-background hover:bg-muted transition-colors"
        >
          {recoveryActionText || "Try Again"}
        </button>
      );
    }

    // Add suggestion to the toast message if available
    const toastMessage = suggestions.length > 0
      ? `${message} ${suggestions[0]}`
      : message;

    toast({
      title: title || (severity === 'error' ? 'Error' : severity === 'warning' ? 'Warning' : severity === 'success' ? 'Success' : 'Information'),
      description: toastMessage,
      variant: variant,
      action: toastAction
    });
  }

  // Execute callback if provided
  if (onError) {
    onError(error);
  }

  // Return the error to allow chaining
  return error;
}

/**
 * Wraps an async function with standardized error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  errorMessage: string = "An unexpected error occurred",
  options: ErrorOptions = {}
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  return async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    try {
      return (await fn(...args)) as ReturnType<T>;
    } catch (error) {
      handleError(error, errorMessage, options);
      return undefined;
    }
  };
}

/**
 * Create a try-catch wrapper for React component event handlers
 */
export function createErrorHandler(
  contextName: string,
  options: ErrorOptions = {}
) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (fn: Function) => {
    return (...args: unknown[]) => {
      try {
        const result = fn(...args);

        // If the result is a promise, add error handling
        if (result instanceof Promise) {
          return result.catch((error) => {
            handleError(error, `Error in ${contextName}`, {
              ...options,
              componentName: contextName
            });
          });
        }

        return result;
      } catch (error) {
        handleError(error, `Error in ${contextName}`, {
          ...options,
          componentName: contextName
        });
      }
    };
  };
}

/**
 * Utility hook for component-level error handling
 */
export function useErrorHandler(componentName: string, options: ErrorOptions = {}) {
  return {
    handleError: (error: unknown, message?: string, recoveryAction?: () => void) =>
      handleError(error, message || `Error in ${componentName}`, {
        ...options,
        context: { ...options.context, component: componentName },
        componentName,
        recoveryAction
      }),

    wrapHandler: createErrorHandler(componentName, options)
  };
}
