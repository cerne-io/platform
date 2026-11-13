import { logError, extractErrorInfo } from "./errorLogging";
import { debugInfo, debugWarn } from "@/utils/debugLogger";

// Patterns for errors that should NOT trigger critical reports from global handlers
const IGNORABLE_ERROR_PATTERNS = [
  'FunctionsHttpError',
  'FunctionsRelayError',
  'FunctionsFetchError',
  'Failed to fetch',
  'Fetch failed',
  'Network request failed',
  'Load failed',
  'NetworkError',
  'net::ERR_',
  'AbortError',
  'The user aborted a request',
  'operation was aborted',
  'ResizeObserver loop',
  'Non-Error promise rejection',
  'Script error',
  'Query was cancelled',
  'cancelled',
  'canceled',
  'error loading dynamically imported module',
  'Failed to load module script',
  'Importing a module script failed',
  'Multiple GoTrueClient instances',
];

/**
 * Checks if an error should be ignored by global handlers
 */
function shouldIgnoreError(error: unknown): boolean {
  if (!error) return true;

  const { message, details, code } = extractErrorInfo(error);
  const errorStr = `${message} ${details || ''} ${code || ''}`.toLowerCase();

  return IGNORABLE_ERROR_PATTERNS.some(pattern =>
    errorStr.includes(pattern.toLowerCase())
  );
}

/**
 * Sets up global error listeners for uncaught exceptions and unhandled rejections
 */
export function setupGlobalErrorListeners() {
  if (typeof window === 'undefined') return;

  // Specific suppression for ResizeObserver loop errors
  // This prevents them from appearing in the console as errors and being picked up by trackers like OpenReplay
  window.addEventListener('error', (e) => {
    if (e.message === 'ResizeObserver loop completed with undelivered notifications' ||
        e.message === 'ResizeObserver loop limit exceeded') {
      e.stopImmediatePropagation();
      e.stopPropagation();
      console.debug('[Global Error] Suppressed harmless ResizeObserver loop warning');
    }
  }, true); // Use capture phase to catch it early

  // Keep references to original handlers
  const originalOnError = window.onerror;
  const originalOnUnhandledRejection = window.onunhandledrejection;

  // Handle uncaught errors
  window.onerror = function (message, source, lineno, colno, error) {
    // Check if this is an ignorable error
    if (shouldIgnoreError(error || message)) {
      console.debug('[Global Error] Ignored transient error:', String(message).substring(0, 100));
      return true;
    }

    const errorInfo = {
      message: String(message),
      source,
      lineno,
      colno
    };

    logError(error || message, "Uncaught error", {
      category: 'unknown',
      source: 'client',
      metadata: errorInfo,
      severity: 'error',
      report: false,
    });

    // Call original handler if it exists
    if (typeof originalOnError === 'function') {
      return originalOnError.apply(this, [message, source, lineno, colno, error]);
    }

    // Return false to indicate the error wasn't handled
    return false;
  };

  // Handle unhandled promise rejections
  window.onunhandledrejection = function (event) {
    const error = event.reason;

    // Check if this is an ignorable error
    if (shouldIgnoreError(error)) {
      console.debug('[Global Error] Ignored transient rejection:', String(error).substring(0, 100));
      event.preventDefault(); // Stop it from surfacing as an unhandled rejection error
      return;
    }

    logError(error, "Unhandled promise rejection", {
      category: 'unknown',
      source: 'client',
      metadata: {
        promiseRejection: true
      },
      severity: 'error',
      report: false,
    });

    // Call original handler if it exists
    if (typeof originalOnUnhandledRejection === 'function') {
      return originalOnUnhandledRejection.apply(this as Window, [event]);
    }
  };

  debugInfo("Global error monitoring initialized");

  return () => {
    // Cleanup function to restore original handlers
    window.onerror = originalOnError;
    window.onunhandledrejection = originalOnUnhandledRejection;
  };
}

/**
 * Measures performance of critical operations and reports if they exceed thresholds
 */
export function monitorPerformance(
  operation: () => unknown,
  operationName: string,
  threshold: number = 1000
) {
  const start = performance.now();
  try {
    const result = operation();
    const duration = performance.now() - start;

    if (duration > threshold) {
      debugWarn(`Performance warning: ${operationName} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);

      // Log as a performance issue
      logError(
        new Error(`Performance threshold exceeded`),
        `Slow operation detected: ${operationName}`,
        {
          severity: 'warning',
          category: 'performance',
          metadata: {
            operationName,
            duration,
            threshold
          },
          report: duration > threshold * 2 // Only report if significantly over threshold
        }
      );
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    // Log both the error and performance data
    logError(error, `Error in ${operationName}`, {
      severity: 'error',
      category: 'performance',
      metadata: {
        operationName,
        duration,
        threshold
      }
    });

    throw error;
  }
}
