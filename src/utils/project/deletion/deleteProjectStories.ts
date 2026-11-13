
import { supabase } from "@/integrations/supabase/client";
import { deleteStoryWithRetries } from '@/services/story/deleteStory';
import { debugLog, debugError, debugWarn } from "@/utils/debugLogger";

/**
 * Deletes all stories associated with a project
 * @param projectId The project ID to clean up
 * @returns Promise resolving to true if successful
 */
export const deleteProjectStories = async (projectId: string): Promise<boolean> => {
  try {
    debugLog("Deleting stories for project:", projectId);

    // ATTEMPT 1: Try using the database function to delete all project data
    // This is our primary approach since it's proven most effective
    try {
      debugLog("Attempting direct project deletion via database function first...");
      const { data, error } = await supabase.rpc('delete_project', {
        project_id_param: projectId
      });

      debugLog("RPC delete_project result (Attempt 1):", { data, error });

      if (!error && data === true) {
        debugLog("Successfully deleted project and related data via database function");
        return true;
      } else {
        debugError("Database function failed (returned false or had error), falling back to manual deletion:", error);
      }
    } catch (err) {
      debugError("Error with direct deletion attempt:", err);
      // Continue with manual deletion as fallback
    }

    // ATTEMPT 2: Manual deletion if database function failed
    // STEP 1: First, fetch all stories in this project
    const { data: stories, error: fetchError, count } = await supabase
      .from('stories')
      .select('id', { count: 'exact' })
      .eq('st_project_id', projectId);

    if (fetchError) {
      debugError("Error fetching project stories:", fetchError);
      return false;
    }

    const storiesCount = count !== null ? count : (stories?.length || 0);
    debugLog(`Found ${storiesCount} stories to delete`);

    if (stories && stories.length > 0) {
      // STEP 2: Delete all slider responses for ALL stories in this project in one go
      const { error: sliderBatchError } = await supabase
        .from('slider_responses')
        .delete()
        .in('story_id', stories.map(story => story.id));

      if (sliderBatchError) {
        debugError("Error deleting batch slider responses:", sliderBatchError);
        // Continue with the process despite error
      }

      // STEP 3: Delete all participant responses for ALL stories in this project in one go
      const { error: participantBatchError } = await supabase
        .from('participant_responses')
        .delete()
        .in('story_id', stories.map(story => story.id));

      if (participantBatchError) {
        debugError("Error deleting batch participant responses:", participantBatchError);
        // Continue with the process despite error
      }

      // STEP 4: Now delete all stories in this project in one go
      const { error: storiesDeleteError } = await supabase
        .from('stories')
        .delete()
        .eq('st_project_id', projectId);

      if (storiesDeleteError) {
        debugError(`Error deleting stories for project ${projectId}:`, storiesDeleteError);

        // STEP 5: If batch deletion failed, try individual story deletion as a fallback
        debugLog("Attempting individual story deletion as fallback...");

        let failedDeletions = 0;
        for (const story of stories) {
          try {
            const storyId = story.id.toString();
            const success = await deleteStoryWithRetries(storyId, 3);
            if (!success) {
              failedDeletions++;
            }
          } catch (err) {
            debugError(`Unexpected error in story deletion:`, err);
            failedDeletions++;
          }
        }

        if (failedDeletions > 0) {
          debugError(`${failedDeletions} stories could not be deleted individually`);
        }
      }
    }

    // FINAL VERIFICATION: Check that all stories were deleted
    const { data: verifyStories, error: verifyError, count: finalCount } = await supabase
      .from('stories')
      .select('id', { count: 'exact' })
      .eq('st_project_id', projectId);

    if (verifyError) {
      debugError("Error verifying story deletion:", verifyError);
      return false;
    }

    const remainingCount = finalCount !== null ? finalCount : (verifyStories?.length || 0);

    if (remainingCount > 0) {
      debugWarn(`Found ${remainingCount} stories still linked to the project after deletion attempts. Final direct attempt...`);

      // FINAL ATTEMPT: One more call to the database function
      try {
        const { data, error } = await supabase.rpc('delete_project', {
          project_id_param: projectId
        });

        debugLog("RPC delete_project result (Final Attempt):", { data, error });

        if (error || data !== true) {
          debugError("Error in final project deletion attempt:", error || "RPC returned false");
          return false;
        }

        return true;
      } catch (error) {
        debugError("Unexpected error in final deletion attempt:", error);
        return false;
      }
    }

    return true;
  } catch (error) {
    debugError("Unexpected error deleting project stories:", error);
    return false;
  }
};
