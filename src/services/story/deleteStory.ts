
import { supabase } from "@/integrations/supabase/client";
import { debugLog, debugError } from "@/utils/debugLogger";

/**
 * Helper to delete the story directly with retry logic (child response rows cascade via FK).
 */
async function deleteRelatedRecordsWithRetry(storyIdStr: string, maxAttempts: number): Promise<boolean> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    try {
      const { error: storyError } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyIdStr);

      if (storyError) {
        debugError(`STORY SERVICE - Error deleting story (attempt ${attempts}):`, storyError);

        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        return false;
      }

      return true;
    } catch (error) {
      debugError(`STORY SERVICE - Error in manual deleteStory attempt ${attempts}:`, error);

      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      return false;
    }
  }

  return false;
}

/**
 * Helper to delete a story and its related records (RPC first, then manual fallback with retry logic)
 */
export const deleteStoryWithRetries = async (
  storyId: string,
  maxRetries: number = 3,
  verifyAfterManual: boolean = false
): Promise<boolean> => {
  try {
    const { error: funcError } = await supabase.rpc('delete_story_with_responses', {
      story_id_param: storyId
    });

    if (!funcError) {
      debugLog("STORY SERVICE - Successfully deleted story using DB function:", storyId);
      return true;
    }
    debugError("STORY SERVICE - DB function error, trying manual deletion:", funcError);
  } catch {
    debugLog("STORY SERVICE - DB function unavailable, proceeding with manual deletion");
  }

  const manualSuccess = await deleteRelatedRecordsWithRetry(storyId, maxRetries);
  if (!manualSuccess) {
    return false;
  }

  if (verifyAfterManual) {
    const { data: verifyDeletion, error: verifyError } = await supabase
      .from('stories')
      .select('id')
      .eq('id', storyId)
      .maybeSingle();

    if (verifyError) {
      debugError("STORY SERVICE - Error verifying deletion:", verifyError);
    }

    if (verifyDeletion) {
      debugError("STORY SERVICE - Story still exists after deletion attempt:", storyId);
      return false;
    }
  }

  debugLog("STORY SERVICE - Successfully deleted story and all related data:", storyId);
  return true;
};

/**
 * Deletes a story and its associated responses from the database
 * @param storyId The ID of the story to delete
 * @returns A boolean indicating if the deletion was successful
 */
export const deleteStory = async (storyId: string | number): Promise<boolean> => {
  debugLog("STORY SERVICE - Deleting story:", storyId);

  // Always convert the ID to string to ensure type compatibility with Supabase
  const storyIdStr = String(storyId);

  try {
    // First verify the user owns the project containing this story
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      debugError("STORY SERVICE - No authenticated user");
      return false;
    }

    // Verify the story exists before cascading deletion
    const { data: storyRow, error: checkError } = await supabase
      .from('stories')
      .select('id, st_project_id')
      .eq('id', storyIdStr)
      .maybeSingle();

    if (checkError) {
      debugError("STORY SERVICE - Error checking story ownership:", checkError);
      return false;
    }

    if (!storyRow) {
      debugError("STORY SERVICE - Story not found:", storyIdStr);
      return false;
    }

    debugLog("STORY SERVICE - Found story to delete:", storyIdStr);

    return await deleteStoryWithRetries(storyIdStr, 3, true);
  } catch (error) {
    debugError("STORY SERVICE - Error in deleteStory:", error);
    return false;
  }
};
