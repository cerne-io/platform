
import React from "react";
import { ErrorSeverity } from "@/utils/errorHandling";

interface ImproverErrorProps {
  error: string | null;
  severity?: ErrorSeverity;
  title?: string;
}

const ImproverError: React.FC<ImproverErrorProps> = ({ 
  error, 
  severity = 'error',
  title = "Error" 
}) => {
  if (!error) {
    return null;
  }

  const bgColor = severity === 'error' ? 'bg-red-50' : 
                 severity === 'warning' ? 'bg-amber-50' : 'bg-blue-50';
  
  const borderColor = severity === 'error' ? 'border-red-100' : 
                     severity === 'warning' ? 'border-amber-100' : 'border-blue-100';
  
  const textColor = severity === 'error' ? 'text-red-800' : 
                   severity === 'warning' ? 'text-amber-800' : 'text-blue-800';
  
  const descriptionColor = severity === 'error' ? 'text-red-700' : 
                          severity === 'warning' ? 'text-amber-700' : 'text-blue-700';

  return (
    <div className={`mt-4 p-4 ${bgColor} border ${borderColor} rounded-md`}>
      <p className={`text-sm font-medium ${textColor}`}>{title}:</p>
      <p className={`text-sm ${descriptionColor} mt-1`}>{error}</p>
    </div>
  );
};

export default ImproverError;
