
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw, Save } from "lucide-react";

interface FormActionButtonsProps {
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
  isLoading: boolean;
  disabled?: boolean;
}

const FormActionButtons: React.FC<FormActionButtonsProps> = ({
  onSave,
  onReset,
  isSaving,
  isLoading,
  disabled = false
}) => {
  return (
    <div className="flex justify-center gap-3 pt-4">
      <Button
        variant="outline"
        onClick={onReset}
        disabled={isLoading || isSaving || disabled}
        className="dark:text-gray-200 dark:border-white/10 dark:hover:bg-white/5"
      >
        <RefreshCcw className="h-4 w-4 mr-2" />
        Reset
      </Button>

      <Button
        variant="default"
        onClick={onSave}
        disabled={isLoading || isSaving || disabled}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  );
};

export default FormActionButtons;
