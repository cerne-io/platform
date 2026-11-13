
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { deleteProjectStories } from './deleteProjectStories';
import { deleteProjectActivityResponses } from './deleteProjectActivityResponses';
import { debugLog, debugError } from "@/utils/debugLogger";

/**
 * Safely deletes a project and its associated data
 * @param projectId The project ID to delete
 * @returns Promise resolving to whether deletion was successful
 */
export const safeDeleteProject = async (projectId: string): Promise<boolean> => {
  try {
    debugLog("Starting safe deletion process for project:", projectId);

    // Try direct project deletion first as it's proven most effective
    try {
      debugLog("Attempting direct project deletion via database function...");
      const { data, error } = await supabase.rpc('delete_project', {
        project_id_param: projectId
      });

      debugLog("RPC delete_project result:", { data, error });

      if (!error && data === true) {
        debugLog("Project successfully deleted via database function");
        return true;
      } else {
        debugError("Database function failed (returned false or had error), falling back to manual deletion:", error);
      }
    } catch (err) {
      debugError("Error with direct deletion attempt:", err);
      // Continue with manual deletion as fallback
    }

    // If direct deletion failed, try the step-by-step approach
    // First delete all stories associated with this project
    const storiesDeleted = await deleteProjectStories(projectId);

    if (!storiesDeleted) {
      toast({
        title: "Error",
        description: "Failed to delete project stories. Please try again.",
        variant: "destructive",
      });
      return false;
    }

    // Then delete all activity responses
    const responsesDeleted = await deleteProjectActivityResponses(projectId);

    if (!responsesDeleted) {
      toast({
        title: "Error",
        description: "Failed to delete project related data. Please try again.",
        variant: "destructive",
      });
      return false;
    }

    // Finally delete the project itself using the database function we created
    const { data, error } = await supabase.rpc('delete_project', {
      project_id_param: projectId
    });

    debugLog("Final RPC delete_project result:", { data, error });

    if (error || data !== true) {
      debugError("Error deleting project:", error || "RPC returned false");
      toast({
        title: "Error deleting project",
        description: error?.message || "Project deletion failed",
        variant: "destructive",
      });
      return false;
    }

    debugLog("Project successfully deleted");
    return true;
  } catch (error) {
    debugError("Unexpected error deleting project:", error);
    toast({
      title: "Error",
      description: "Failed to delete project. Please try again.",
      variant: "destructive",
    });
    return false;
  }
};
