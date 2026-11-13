
import React from "react";
import { ErrorDisplay } from "@/components/ui/error-display";

interface FormErrorStateProps {
  error: string;
  code?: string;
}

const FormErrorState: React.FC<FormErrorStateProps> = ({ error, code }) => {
  return (
    <ErrorDisplay
      severity="error"
      title="Error Loading Form"
      message={error || "An unknown error occurred. Please try again later or contact the form creator."}
      code={code}
      showIcon={true}
      className="my-6"
    />
  );
};

export default FormErrorState;
