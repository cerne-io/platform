
import React from 'react';
import { ErrorDisplay } from "@/components/ui/error-display";

interface FormErrorAlertProps {
  error: string | null;
  code?: string | null;
  title?: string;
}

const FormErrorAlert: React.FC<FormErrorAlertProps> = ({ 
  error, 
  code,
  title = "Error" 
}) => {
  if (!error) return null;
  
  return (
    <ErrorDisplay
      severity="error"
      title={title}
      message={error}
      code={code}
      showIcon={true}
    />
  );
};

export default FormErrorAlert;
