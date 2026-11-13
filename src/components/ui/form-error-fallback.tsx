
import React from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface FormErrorFallbackProps {
  error?: Error;
  title?: string;
  message?: string;
  resetError?: () => void;
  componentName?: string;
  action?: React.ReactNode;
}

/**
 * Error fallback component designed for form or component-level errors
 */
export const FormErrorFallback: React.FC<FormErrorFallbackProps> = ({
  error,
  title = "Something went wrong",
  message,
  resetError,
  componentName,
  action
}) => {
  const displayMessage = message || (error ? error.message : "An unexpected error occurred");
  
  const handleReset = () => {
    if (resetError) {
      resetError();
    }
  };
  
  return (
    <Alert variant="destructive" className="my-4 animate-in fade-in duration-300">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="text-sm space-y-3">
        <p>{displayMessage}</p>
        
        {componentName && process.env.NODE_ENV !== 'production' && (
          <div className="text-xs opacity-80">
            Error in component: {componentName}
          </div>
        )}
        
        {(action || resetError) && (
          <div className="flex gap-3 items-center pt-1">
            {action}
            
            {resetError && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                Try again
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};
