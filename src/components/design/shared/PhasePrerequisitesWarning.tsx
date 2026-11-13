import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { PhaseValidationResult } from '@/services/validation/phaseValidationService';


interface PhasePrerequisitesWarningProps {
  validationResult: PhaseValidationResult;
  className?: string;
  title?: string;
  description?: string | React.ReactNode;
}

export const PhasePrerequisitesWarning: React.FC<PhasePrerequisitesWarningProps> = ({
  validationResult,
  className = '',
  title = 'Prerequisites Required',
  description = 'Complete the Context and Define phases to enable AI-powered generation with project-specific insights.'
}) => {


  if (validationResult.isValid) {
    return null; // Don't show warning if validation passes
  }

  return (
    <Alert variant="warning" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <div>{description}</div>

        {(validationResult.missingRequirements.length > 0) && (
          <div className="mt-2 text-sm border border-current/20 bg-current/5 p-3 rounded-md">
            <p className="font-medium mb-2">Missing Requirements:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              {validationResult.missingRequirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};