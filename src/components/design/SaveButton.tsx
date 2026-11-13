
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

interface SaveButtonProps {
  saving: boolean;
  isDirty?: boolean;
}

const SaveButton: React.FC<SaveButtonProps> = ({ saving, isDirty = false }) => {
  const { currentUserProjectRole } = useProject();
  const isReadOnly = currentUserProjectRole === 'viewer';

  if (isReadOnly) return null; // Don't show save button at all for viewers

  return (
    <div className="flex justify-end">
      <Button
        type="submit"
        disabled={saving || !isDirty}
        variant={isDirty ? "default" : "outline"}
        className={`flex items-center gap-2 font-medium px-4 py-2 transition-all duration-200 ${isDirty
          ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          : "text-muted-foreground border-transparent bg-transparent opacity-50 cursor-not-allowed"
          }`}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save Response
      </Button>
    </div>
  );
};

export default SaveButton;
