
import { debugError } from "@/utils/debugLogger";
import { supabase } from "@/integrations/supabase/client";

/**
 * Deletes all activity responses associated with a project
 * @param projectId The project ID to clean up
 * @returns Promise resolving to true if successful
 */
export const deleteProjectActivityResponses = async (projectId: string): Promise<boolean> => {
  try {
    // Delete all activity responses associated with this project
    const { error } = await supabase
      .from('activity_responses')
      .delete()
      .eq('ar_project_id', projectId);

    if (error) {
      debugError("Error deleting activity responses:", error);
      return false;
    }

    return true;
  } catch (error) {
    debugError("Unexpected error deleting project activity responses:", error);
    return false;
  }
};
