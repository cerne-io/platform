
import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, PlusCircle } from "lucide-react";

interface EmptyProjectStateProps {
  onCreateClick: () => void;
}

const EmptyProjectState: React.FC<EmptyProjectStateProps> = ({ onCreateClick }) => {
  return (
    <div className="text-center py-16 px-6 border border-dashed border-border/80 bg-card rounded-xl shadow-xs">
      <FileText className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
      <h3 className="text-xl sm:text-2xl font-bold tracking-[-0.02em] text-foreground font-heading">No projects yet</h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto">
        Get started by creating your first narrative instrument project or explore a sample template.
      </p>
      <Button
        onClick={onCreateClick}
        className="mt-6 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs rounded-lg active:scale-95 transition-transform"
      >
        <PlusCircle className="h-4 w-4" />
        <span>Create Project</span>
      </Button>
    </div>
  );
};

export default EmptyProjectState;
