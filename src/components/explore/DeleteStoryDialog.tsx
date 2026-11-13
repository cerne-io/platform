
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { AlertCircle, Lock } from "lucide-react";
import { useToast } from "@/hooks/toast";
import { useDeleteStoryMutation } from "@/hooks/mutations/useDeleteStoryMutation";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { debugLog, debugError } from "@/utils/debugLogger";

interface DeleteStoryDialogProps {
  storyId: string | number;
  storyTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleteSuccess: () => void;
}

const DeleteStoryDialog = ({ storyId, storyTitle, isOpen, onClose, onDeleteSuccess }: DeleteStoryDialogProps) => {
  const { toast } = useToast();
  const { activeProject } = useProject();
  const isAdmin = Boolean(useAuth().user);

  // Use TanStack Query mutation for deleting
  const { mutateAsync: deleteStoryMutation, isPending: isDeleting } = useDeleteStoryMutation(activeProject?.id);

  // Check if this is a template project and user is not a superadmin
  const isTemplateProject = activeProject?.is_template;
  const canDeleteStory = !(isTemplateProject && !isAdmin);

  const handleDelete = async () => {
    if (isDeleting || !canDeleteStory) return; // Prevent deletion if user doesn't have permission

    try {
      debugLog("Attempting to delete story with ID:", storyId);
      const success = await deleteStoryMutation(storyId);

      if (success) {
        debugLog("Story successfully deleted:", storyId);
        toast({
          title: "Story deleted",
          description: "The story has been permanently removed.",
        });
        // Call onDeleteSuccess to refresh the story list
        onDeleteSuccess();
        // Close the dialog on success
        onClose();
      } else {
        debugError("Failed to delete story:", storyId);
        toast({
          title: "Error",
          description: "Failed to delete the story. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      debugError("Error deleting story:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {canDeleteStory ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Lock className="h-5 w-5 text-amber-500" />
            )}
            {canDeleteStory ? "Delete Story" : "Cannot Delete Story"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {canDeleteStory ? (
              <>
                Are you sure you want to delete <span className="font-medium">"{storyTitle}"</span>? This action
                cannot be undone and all associated data will be permanently removed.
              </>
            ) : (
              <>
                Stories in template projects can only be deleted by administrators.
                This restriction helps maintain the integrity of template data for all users.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          {canDeleteStory && (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteStoryDialog;
