import { useState } from "react";
import { toast } from "@/hooks/toast";
import { handleError, ErrorSeverity } from "@/utils/errorHandling";
import { logError } from "@/utils/errorLogging";

interface FeedbackOptions {
  duration?: number;
  action?: React.ReactNode;
  recoveryAction?: () => void;
  recoveryActionText?: string;
  suggestions?: string[];
  componentName?: string;
  category?: string;
}

/**
 * Hook for managing user feedback including success messages, warnings, and errors
 */
export function useFeedback(defaultComponentName: string = "UnknownComponent") {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Show a success toast message
   */
  const showSuccess = (message: string, options?: FeedbackOptions) => {
    toast({
      title: "Success",
      description: message,
      variant: "success",
      duration: options?.duration || 3000,
      action: options?.action
    });

    // Log success for analytics if needed
    if (process.env.NODE_ENV === "production") {
      logError({ message }, "User success", {
        severity: "success",
        componentName: options?.componentName || defaultComponentName,
        metadata: {
          type: "success_feedback",
          message
        },
        report: false
      });
    }
  };

  /**
   * Show an info toast message
   */
  const showInfo = (message: string, options?: FeedbackOptions) => {
    toast({
      title: "Information",
      description: message,
      variant: "info",
      duration: options?.duration || 5000,
      action: options?.action
    });
  };

  /**
   * Show a warning toast message
   */
  const showWarning = (message: string, options?: FeedbackOptions) => {
    toast({
      title: "Warning",
      description: message,
      variant: "warning",
      duration: options?.duration || 7000,
      action: options?.action
    });

    // Log warning for analytics
    logError(new Error(message), "User warning", {
      severity: "warning",
      componentName: options?.componentName || defaultComponentName,
      metadata: {
        type: "warning_feedback",
        message
      },
      report: false
    });
  };

  /**
   * Handle an error with user feedback
   */
  const showError = (error: unknown, message?: string, options?: FeedbackOptions) => {
    handleError(error, message || "An error occurred", {
      componentName: options?.componentName || defaultComponentName,
      recoveryAction: options?.recoveryAction,
      recoveryActionText: options?.recoveryActionText,
      suggestions: options?.suggestions
    });
  };

  /**
   * Wrap an async function with loading state and error handling
   */
  const withFeedback = <T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    options?: {
      loadingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
      severity?: ErrorSeverity;
      showLoadingState?: boolean;
    }
  ): ((...args: Parameters<T>) => Promise<ReturnType<T> | undefined>) => {
    return async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
      try {
        // Show loading state if requested
        if (options?.showLoadingState !== false) {
          setIsLoading(true);
          if (options?.loadingMessage) {
            toast({
              title: "Loading",
              description: options.loadingMessage,
              variant: "default"
            });
          }
        }

        const result = await fn(...args);

        // Show success message if provided
        if (options?.successMessage) {
          showSuccess(options.successMessage);
        }

        return result as ReturnType<T>;
      } catch (error) {
        // Handle error with feedback
        showError(error, options?.errorMessage || "Operation failed");
        return undefined;
      } finally {
        setIsLoading(false);
      }
    };
  };

  return {
    isLoading,
    setIsLoading,
    showSuccess,
    showInfo,
    showWarning,
    showError,
    withFeedback
  };
}

export default useFeedback;
