import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Copy, Loader2 } from "lucide-react";
import { debugError } from "@/utils/debugLogger";

interface CopyTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  onConfirm: (newName: string) => Promise<void> | void;
}

const CopyTemplateDialog: React.FC<CopyTemplateDialogProps> = ({
  open,
  onOpenChange,
  templateName,
  onConfirm,
}) => {
  const [projectName, setProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setProjectName(`${templateName} - My Copy`);
      setIsSubmitting(false); // Reset on open
    }
  }, [open, templateName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (projectName.trim() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onConfirm(projectName.trim());
      } catch (err) {
        debugError("Failed to copy template:", err);
      } finally {
        // Only reset if the dialog is kept open (usually onConfirm closes it and onOpenChange handles reset implicitly)
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-background border border-border/80 shadow-lg rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            <Copy className="mr-2 h-5 w-5 inline text-primary" />
            Copy Template Project
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5">
            Create your own editable copy of this template with all sample stories included.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name" className="text-sm font-medium text-foreground">Project Name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
                disabled={isSubmitting}
                className="w-full bg-background border-border/80 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-lg"
              />
            </div>
            <div className="rounded-xl bg-muted/40 border border-border/60 p-4 space-y-2.5">
              <div className="text-sm font-medium text-foreground flex items-center">
                <BookOpen className="mr-2 h-4 w-4 inline text-primary" />
                <span>What you'll get:</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 ml-6 list-disc">
                <li>Complete copy of project structure</li>
                <li>All sample stories for exploration</li>
                <li>Full editing capabilities</li>
                <li>Your own dashboard with real data</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-border/80 hover:bg-accent text-foreground rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-tour="confirm-copy-template-btn"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs rounded-lg"
              disabled={!projectName.trim() || isSubmitting}
              onClick={() => {
                if (isSubmitting) return;
                // Update URL to help tour validation
                const newParams = new URLSearchParams(window.location.search);
                newParams.set('status', 'copying-template');
                window.history.pushState({}, '', `${window.location.pathname}?${newParams.toString()}`);
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Copying...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Template
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CopyTemplateDialog;
