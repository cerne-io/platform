
import React from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface AuthWarningProps {
  isAuthenticated: boolean;
  authChecked: boolean;
}

const AuthWarning: React.FC<AuthWarningProps> = ({
  isAuthenticated,
  authChecked
}) => {
  if (isAuthenticated || !authChecked) return null;
  
  return (
    <Alert variant="warning">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Not logged in</AlertTitle>
      <AlertDescription>
        You're not currently logged in. You can preview logos, but to permanently upload and save them, please log in first.
      </AlertDescription>
    </Alert>
  );
};

export default AuthWarning;
