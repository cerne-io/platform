import { debugError } from "@/utils/debugLogger";
import React, { Component, ErrorInfo, ReactNode } from "react";
import { generateUUID } from "@/utils/uuid";

import { logError, ErrorCategory } from "@/utils/errorLogging";
import { LocalErrorFallback } from "./local-error-fallback";

interface ErrorBoundaryProps {
  /** Child components to wrap with error boundary */
  children: ReactNode;
  /** Custom fallback component */
  fallback?: ReactNode;
  /** Whether to show detailed error information */
  showDetails?: boolean;
  /** Component name for better error reporting */
  componentName?: string;
  /** Category of error for specialized logging (e.g., 'ai', 'api', 'ui') */
  category?: ErrorCategory;
  /** Additional logging callback */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  /** Telemetry reference ID for the single event reported for this crash */
  eventId: string | null;
}

/**
 * Error boundary component that catches errors in its children
 * and displays a fallback UI when errors occur
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      eventId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const category = this.props.category || 'ui';
    
    // Log the error to our centralized error logging system
    logError(error, `Error in ${this.props.componentName || 'component'} (${category})`, {
      componentName: this.props.componentName,
      category: category,
      metadata: {
        componentStack: errorInfo.componentStack,
        reactPhase: 'render',
        isAiError: category === 'ai'
      },
      severity: 'error',
      // Reported exactly once below via the telemetry facade
      report: false,
    });

    // Generate a local reference ID for the fallback UI
    const eventId = generateUUID().slice(0, 8);
    this.setState({ eventId });

    // Log the error to the console
    debugError(`Error in ${this.props.componentName || 'component'} [${category}]:`, error);
    debugError("Component stack:", errorInfo.componentStack);

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, eventId: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback or default local fallback
      if (this.props.fallback) {
        const { fallback } = this.props;
        // Inject crash context into component-element fallbacks (not DOM elements)
        if (React.isValidElement(fallback) && typeof fallback.type !== "string") {
          return React.cloneElement(fallback as React.ReactElement<Record<string, unknown>>, {
            error: this.state.error || undefined,
            eventId: this.state.eventId,
            resetErrorBoundary: this.resetError,
          });
        }
        return fallback;
      }

      return (
        <LocalErrorFallback 
          error={this.state.error || undefined} 
          eventId={this.state.eventId}
          resetErrorBoundary={this.resetError} 
          componentName={this.props.componentName}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap a component with an ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ErrorBoundaryProps, 'children'> = {}
) {
  const displayName = Component.displayName || Component.name || 'Component';

  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary {...options} componentName={displayName}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${displayName})`;
  return WrappedComponent;
}
