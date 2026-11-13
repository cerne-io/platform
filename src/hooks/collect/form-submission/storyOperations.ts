// Main logic for saving a story, imports demo/audio modules

import { supabase } from "@/integrations/supabase/client";
import { apiFetch } from "@/lib/localClient";
import { buildStorySubmissionPayload } from './publicSubmissionHandler';
import { StoryData } from './types';
import { sanitizeText, MAX_TITLE_LENGTH, MAX_STORY_TEXT_LENGTH, MAX_EMOTIONAL_RESPONSE_LENGTH, MAX_ADDITIONAL_COMMENTS_LENGTH } from './validationSchemas';
import { debugLog, debugError } from "@/utils/debugLogger";

interface StoryDataInsert {
  id?: string;
  title: string;
  text: string;
  emotional_response: string;
  additional_comments?: string;
  is_public: boolean;
  is_imported: boolean;
  story_source?: string;
  user_id: string | null;
  st_project_id: string | null;
  form_id?: string;
  has_audio?: boolean;
  audio_url?: string;
  transcription_status?: string;
}

function prepareStoryData(formData: StoryData, finalProjectId: string, userId: string | undefined): StoryDataInsert {
  const title = sanitizeText(formData.title || '').substring(0, MAX_TITLE_LENGTH);
  const text = sanitizeText(formData.text || '').substring(0, MAX_STORY_TEXT_LENGTH);
  const emotionalResponse = sanitizeText(formData.emotionalResponse || '').substring(0, MAX_EMOTIONAL_RESPONSE_LENGTH);
  const additionalComments = formData.additionalComments
    ? sanitizeText(formData.additionalComments).substring(0, MAX_ADDITIONAL_COMMENTS_LENGTH)
    : undefined;

  return {
    title,
    text,
    emotional_response: emotionalResponse,
    additional_comments: additionalComments,
    is_public: false,
    is_imported: formData.isImported || false,
    story_source: formData.storySource,
    user_id: userId || null,
    st_project_id: finalProjectId,
    form_id: formData.formId || undefined,
    transcription_status: 'completed',
  };
}

// Function to save an authenticated story (public submissions go through POST /api/public/submit-story)
export const saveStory = async (
  formData: StoryData,
  projectId?: string,
  userId?: string
): Promise<string | null> => {
  try {
    const finalProjectId = projectId || formData.projectId;

    if (!finalProjectId) {
      debugError("DB SAVE ERROR - No project ID provided for authenticated story submission");
      throw new Error("Project ID is required");
    }

    const storyData = prepareStoryData(formData, finalProjectId, userId);

    const { data, error } = await supabase
      .from('stories')
      .insert(storyData)
      .select('id, is_public')
      .single();

    if (error) {
      debugError("❌ Database insert error:", error);
      throw error;
    }

    const storyId = data?.id;
    debugLog("✅ Authenticated story inserted successfully:", {
      storyId,
      is_public_in_db: data?.is_public
    });

    const { queryClient } = await import('@/lib/queryClient');
    const { storiesQueryKey } = await import('@/hooks/queries/useStoriesQuery');
    void queryClient.invalidateQueries({ queryKey: storiesQueryKey(finalProjectId) });

    return storyId || null;
  } catch {
    return null;
  }
};

/**
 * Saves an authenticated story and all its responses in one server transaction.
 */
export const submitAuthenticatedStory = async (
  formData: StoryData,
  projectId?: string,
  userId?: string
): Promise<string | null> => {
  const finalProjectId = projectId || formData.projectId;
  if (!finalProjectId) {
    debugError("DB SAVE ERROR - No project ID provided for authenticated story submission");
    return null;
  }

  try {
    const res = await apiFetch("/api/db/submit-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: finalProjectId,
        formId: formData.formId || null,
        userId: userId || null,
        isImported: Boolean(formData.isImported),
        storySource: formData.storySource || null,
        transcriptionStatus: "completed",
        ...buildStorySubmissionPayload(formData),
      }),
    });

    if (!res.ok) {
      debugError("Authenticated story submission failed:", res.status);
      return null;
    }

    const body = (await res.json()) as { storyId?: string };
    if (!body?.storyId) return null;

    const { queryClient } = await import('@/lib/queryClient');
    const { storiesQueryKey } = await import('@/hooks/queries/useStoriesQuery');
    void queryClient.invalidateQueries({ queryKey: storiesQueryKey(finalProjectId) });

    return body.storyId;
  } catch (error) {
    debugError("Error in submitAuthenticatedStory:", error);
    return null;
  }
};
