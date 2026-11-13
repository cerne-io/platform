/* eslint-disable react-refresh/only-export-components */

import React from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Button } from "@/components/ui/button";
import { RefreshCw, Home, ArrowLeft, Mail } from "lucide-react";

interface GlobalErrorFallbackProps {
  error?: Error;
  /** Telemetry reference ID injected by ErrorBoundary for the reported crash */
  eventId?: string | null;
  resetErrorBoundary?: () => void;
}

const GlobalErrorFallback: React.FC<GlobalErrorFallbackProps> = ({ error, eventId, resetErrorBoundary }) => {
  // Reporting is owned by ErrorBoundary (one event per crash); this component only displays the ID.

  const handleReset = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      window.location.reload();
    }
  };

  const goToHomepage = () => {
    window.location.href = "/";
  };

  const goBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="max-w-md w-full bg-background rounded-lg shadow-lg p-6 border">
        <div className="text-center">
          <div className="bg-red-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-primary mb-2">Application Error</h2>
          <p className="text-muted-foreground mb-4">
            An unexpected error occurred. Please try one of the recovery options below.
          </p>

          {eventId && (
            <div className="bg-muted px-3 py-2 rounded-md mb-4 text-xs font-mono text-muted-foreground select-all">
              Reference ID: {eventId}
            </div>
          )}

          {process.env.NODE_ENV !== 'production' && error && (
            <div className="bg-muted p-3 rounded-md mb-4 text-left overflow-auto max-h-40 text-xs">
              <p className="font-semibold mb-1">Development Diagnostics:</p>
              <pre className="whitespace-pre-wrap break-words">{error.message}</pre>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <Button onClick={handleReset} className="flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Reload App
            </Button>

            <Button
              variant="outline"
              onClick={goBack}
              className="flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>

            <Button
              variant="secondary"
              onClick={goToHomepage}
              className="flex items-center justify-center gap-2 col-span-2"
            >
              <Home className="h-4 w-4" />
              Go to Homepage
            </Button>
          </div>

          {import.meta.env.VITE_SUPPORT_EMAIL ? (
            <a
              href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL}?subject=Application%20Issue%20${encodeURIComponent(eventId || 'Unknown')}`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
            >
              <Mail className="h-3.5 w-3.5" />
              Contact Support with Reference ID
            </a>
          ) : (
            <a
              href="https://github.com/acuginotti/cerne-app/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
            >
              <Mail className="h-3.5 w-3.5" />
              Report Issue on GitHub
            </a>
          )}

          <div className="mt-4 text-xs text-muted-foreground">
            <p>If this issue persists, please try clearing your browser cache or using a private window.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Global error boundary for wrapping the entire application
 */
export const GlobalErrorBoundary = {
  Fallback: GlobalErrorFallback,
  Wrapper: ({ children }: { children: React.ReactNode }) => (
    <ErrorBoundary
      fallback={<GlobalErrorFallback />}
      showDetails={process.env.NODE_ENV !== 'production'}
      componentName="Application"
    >
      {children}
    </ErrorBoundary>
  )
};

export default GlobalErrorBoundary;
