
import React from "react";
import { ErrorDisplay } from "@/components/ui/error-display";

interface FormErrorStateProps {
  error?: string | null;
  errorCode?: string | null;
}

const FormErrorState: React.FC<FormErrorStateProps> = ({ 
  error = "No active project selected. Please select a project to continue.", 
  errorCode 
}) => {
  return (
    <ErrorDisplay
      severity="error"
      title="Form Error"
      message={error}
      code={errorCode}
      className="my-4"
    />
  );
};

export default FormErrorState;
