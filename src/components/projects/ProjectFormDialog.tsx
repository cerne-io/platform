
import React, { useState, useEffect } from "react";
import { Project } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookOpen } from "lucide-react";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, description: string) => void;
  project?: Project | null;
  mode: "create" | "edit";
  isTemplate?: boolean;
}

const ProjectFormDialog: React.FC<ProjectFormDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  project,
  mode,
  isTemplate = false
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (project && mode === "edit") {
      setFormData({
        name: project.name,
        description: project.description || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
      });
    }
  }, [project, mode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    onSubmit(formData.name, formData.description);
  };

  const handleClose = () => {
    setFormData({ name: "", description: "" });
    onOpenChange(false);
  };

  let title = mode === "create" ? "Create New Project" : "Edit Project";
  let description = mode === "create"
    ? "Enter details for your new project"
    : "Update your project details";

  if (isTemplate) {
    title = mode === "create" ? "Create New Template" : "Edit Template";
    description = mode === "create"
      ? "Enter details for the template project that all users will see"
      : "Update the template project details";
  }

  const submitButtonText = mode === "create" ? "Create Project" : "Save Changes";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-background border border-border/80 shadow-lg rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground flex items-center">
            {isTemplate && <BookOpen className="mr-2 h-5 w-5 inline text-primary" />}
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {description}
            {isTemplate && mode === "create" && (
              <span className="block mt-2 text-primary font-medium">
                Note: Template projects will be visible to all users, but only superadmins can modify them.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              Project Name
            </label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Customer Journey Study"
              required
              className="border-border/80 shadow-xs text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium text-foreground">
              Description
            </label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter project description (optional)"
              rows={3}
              className="border-border/80 shadow-xs text-sm resize-none"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} className="border-border/80 shadow-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="shadow-xs"
          >
            {submitButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectFormDialog;
