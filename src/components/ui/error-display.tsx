
import React from "react";
import { AlertCircle, AlertTriangle, Info, CheckCircle, RefreshCw, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorSeverity } from "@/utils/errorHandling";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { logError } from "@/utils/errorLogging";
import { toast } from "@/hooks/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

export interface ErrorDisplayProps {
  /** Error message to display */
  message: string | null | undefined;
  /** Optional error code for specialized handling */
  code?: string | null;
  /** Optional title for the error (defaults based on severity) */
  title?: string;
  /** Severity of the error */
  severity?: ErrorSeverity;
  /** Whether to show an icon */
  showIcon?: boolean;
  /** Custom component to render inside the error */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Optional action button(s) */
  action?: React.ReactNode;
  /** Retry handler */
  onRetry?: () => void;
  /** Error instance */
  error?: Error | unknown;
  /** Component name where error occurred */
  componentName?: string;
}

/**
 * Base error display component supporting multiple severity levels and consistent styling
 */
export function ErrorDisplay({
  message,
  code,
  title,
  severity = "error",
  showIcon = true,
  children,
  className,
  action,
  onRetry,
  error,
  componentName,
}: ErrorDisplayProps) {
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState("");



  // Map severity to alert variant
  const variant = severity === "error" ? "destructive" : "default";

  // Select appropriate icon based on severity
  const Icon = React.useMemo(() => {
    switch (severity) {
      case "error":
        return AlertCircle;
      case "warning":
        return AlertTriangle;
      case "info":
        return Info;
      case "success":
        return CheckCircle;
      default:
        return AlertCircle;
    }
  }, [severity]);

  // Default titles based on severity
  const defaultTitle = React.useMemo(() => {
    switch (severity) {
      case "error":
        return "Error";
      case "warning":
        return "Warning";
      case "info":
        return "Information";
      case "success":
        return "Success";
      default:
        return "Notice";
    }
  }, [severity]);

  // Use provided title or fall back to default
  const displayTitle = title || defaultTitle;

  // Handle reporting an error

  // Don't render if no message is provided
  if (!message && !children) {
    return null;
  }

  const handleReportError = () => {
    // Open the report dialog
    setReportDialogOpen(true);
  };

  // Submit the error report
  const submitErrorReport = () => {
    // Log the error with additional user feedback
    if (error) {
      logError(error, message || "User reported error", {
        componentName,
        category: 'ui',
        severity: severity,
        metadata: {
          userReport: true,
          userFeedback: additionalInfo,
          errorCode: code
        },
        report: true
      });
    } else {
      // If no error object is available, create one
      logError(new Error(message || "User reported issue"), "User reported issue", {
        componentName,
        category: 'ui',
        severity: severity,
        metadata: {
          userReport: true,
          userFeedback: additionalInfo,
          errorCode: code
        },
        report: true
      });
    }

    // Close dialog and show confirmation
    setReportDialogOpen(false);
    setAdditionalInfo("");
    toast({
      title: "Report Submitted",
      description: "Thank you for your feedback. We'll look into this issue.",
      variant: "success"
    });
  };

  // Default retry handler
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (severity === "error") {
      // Default retry action is to reload the current page
      window.location.reload();
    }
  };

  // Generate suggestions based on the error type
  const getSuggestions = () => {
    if (!message) return null;

    // Only show suggestions for errors and warnings
    if (severity !== "error" && severity !== "warning") return null;

    let suggestion = "Try refreshing the page or try again later.";

    // Network related suggestions
    if (message.toLowerCase().includes("network") ||
      message.toLowerCase().includes("connection") ||
      message.toLowerCase().includes("offline")) {
      suggestion = "Check your internet connection and try again.";
    }

    // Permission related suggestions
    else if (message.toLowerCase().includes("permission") ||
      message.toLowerCase().includes("access") ||
      message.toLowerCase().includes("unauthorized")) {
      suggestion = "You may not have the necessary permissions. Try logging out and logging back in.";
    }

    // Data loading suggestions
    else if (message.toLowerCase().includes("load") ||
      message.toLowerCase().includes("fetch") ||
      message.toLowerCase().includes("data")) {
      suggestion = "There was an issue loading the data. Try refreshing the page.";
    }

    return suggestion ? (
      <div className="mt-2 text-sm opacity-80">
        <strong>Suggestion:</strong> {suggestion}
      </div>
    ) : null;
  };

  return (
    <>
      <Alert
        variant={variant}
        className={cn(
          "relative",
          severity === "warning" && "border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:border-amber-900/50 dark:text-amber-200",
          severity === "info" && "border-blue-200 bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:border-blue-900/50 dark:text-blue-200",
          severity === "success" && "border-green-200 bg-green-50 text-green-800 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-200",
          className
        )}
      >
        {showIcon && <Icon className="h-4 w-4" />}
        {displayTitle && <AlertTitle className="mb-1 font-medium">{displayTitle}</AlertTitle>}
        <AlertDescription className="mt-1">
          {message}
          {children}
          {getSuggestions()}
        </AlertDescription>

        <div className="mt-3 flex items-center gap-3">
          {action}

          {(severity === "error" || severity === "warning") && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          )}

          {(severity === "error" || severity === "warning") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReportError}
              className="flex items-center gap-1.5"
            >
              <Send className="h-4 w-4" />
              Report Issue
            </Button>
          )}
        </div>

        {code && (
          <div className="mt-2">
            <code className="text-xs opacity-70">Error code: {code}</code>
          </div>
        )}
      </Alert>

      {/* Error Reporting Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
            <DialogDescription>
              Provide additional details about what happened when this error occurred.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 p-3 bg-muted rounded-md">
              <p className="font-medium">{message}</p>
              {code && <code className="text-xs block mt-1">Error code: {code}</code>}
            </div>
            <Textarea
              placeholder="What were you trying to do when this happened? (optional)"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              className="resize-none"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={submitErrorReport}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
