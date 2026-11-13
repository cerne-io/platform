import React from "react";
import { Loader2 } from "lucide-react";

const FormLoadingState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div className="text-sm font-medium text-muted-foreground">
        Loading Story Collection...
      </div>
    </div>
  );
};

export default FormLoadingState;
