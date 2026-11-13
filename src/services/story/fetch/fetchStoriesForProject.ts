
import { supabase } from "@/integrations/supabase/client";
import { Story } from "@/types/story";
import { formatStoryResponse } from "@/utils/story/formattingUtils";
import { fetchSliderResponsesForProject } from "./fetchSliderResponses";
import { fetchParticipantResponsesForProject } from "./fetchParticipantResponses";
import { fetchTriangleResponsesForProject } from "./fetchTriangleResponses";
import { isValidSentiment, determineEmotionLocally } from "@/utils/sentiment/emotionClassifier";
import { debugLog, debugError } from "@/utils/debugLogger";

const STORIES_PAGE_SIZE = 1000;

/**
 * Fetches stories from the database for a specific project without blocking on external sentiment services.
 * @param projectId The project ID to fetch stories for
 * @param signal Optional AbortSignal to cancel in-flight queries
 * @param limit Optional maximum number of stories to fetch (omitted fetches all pages)
 * @returns An array of formatted story objects
 */
export const fetchStoriesForProject = async (
  projectId: string | undefined,
  signal?: AbortSignal,
  limit?: number
): Promise<Story[]> => {
  if (!projectId) {
    debugLog("STORY SERVICE - No project ID provided, returning empty array");
    return [];
  }

  try {
    const storiesData: Array<Record<string, unknown>> = [];
    let page = 0;

    while (true) {
      const remaining = limit !== undefined ? limit - storiesData.length : STORIES_PAGE_SIZE;
      if (remaining <= 0) break;

      const pageSize = Math.min(STORIES_PAGE_SIZE, remaining);
      const from = page * STORIES_PAGE_SIZE;
      const to = from + pageSize - 1;

      let query = supabase
        .from('stories')
        .select(`
          id,
          title,
          text,
          emotional_response,
          feeling_sentiment,
          additional_comments,
          created_at,
          updated_at,
          is_public,
          is_imported,
          user_id,
          st_project_id,
          has_audio,
          audio_url
        `)
        .eq('st_project_id', projectId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, to);

      if (signal) {
        query = query.abortSignal(signal);
      }

      const { data: pageRows, error: storiesError } = await query;

      if (storiesError) {
        debugError("STORY SERVICE - Error fetching stories:", storiesError);
        throw storiesError;
      }

      const rows = (pageRows || []) as Array<Record<string, unknown>>;
      if (rows.length === 0) break;

      storiesData.push(...rows);
      if (rows.length < pageSize) break;
      page++;
    }

    debugLog(`STORY SERVICE - Found ${storiesData.length} stories for project ${projectId}`);

    if (storiesData.length === 0) {
      return [];
    }

    // Scope response fetches to the fetched story IDs when a limit was requested
    const storyIdsSubset = limit !== undefined ? storiesData.map(s => String(s.id)) : undefined;
    const [sliderResponsesData, participantResponsesData, triangleResponsesData] = await Promise.all([
      fetchSliderResponsesForProject(projectId, storyIdsSubset),
      fetchParticipantResponsesForProject(projectId, storyIdsSubset),
      fetchTriangleResponsesForProject(projectId, storyIdsSubset)
    ]);

    // Create Maps for O(1) lookup of responses by story_id
    const sliderResponsesByStory = new Map<string, typeof sliderResponsesData>();
    const participantResponsesByStory = new Map<string, typeof participantResponsesData>();
    const triangleResponsesByStory = new Map<string, typeof triangleResponsesData>();

    (sliderResponsesData || []).forEach(response => {
      const storyResponses = sliderResponsesByStory.get(response.story_id) || [];
      storyResponses.push(response);
      sliderResponsesByStory.set(response.story_id, storyResponses);
    });

    (participantResponsesData || []).forEach(response => {
      const storyResponses = participantResponsesByStory.get(response.story_id) || [];
      storyResponses.push(response);
      participantResponsesByStory.set(response.story_id, storyResponses);
    });

    (triangleResponsesData || []).forEach(response => {
      const storyResponses = triangleResponsesByStory.get(response.story_id) || [];
      storyResponses.push(response);
      triangleResponsesByStory.set(response.story_id, storyResponses);
    });

    // Process each story with its responses and non-blocking sentiment resolution
    const formattedStories = storiesData.map(story => {
      const storyId = String(story.id);
      const storySliderResponses = sliderResponsesByStory.get(storyId) || [];
      const storyParticipantResponses = participantResponsesByStory.get(storyId) || [];
      const storyTriangleResponses = triangleResponsesByStory.get(storyId) || [];

      // Validate runtime persisted sentiment
      const hasPersistedSentiment = isValidSentiment(story.feeling_sentiment);
      let feelingSentiment: "positive" | "negative" | "neutral" | undefined;

      if (hasPersistedSentiment) {
        feelingSentiment = story.feeling_sentiment as "positive" | "negative" | "neutral";
      } else if (typeof story.emotional_response === 'string' && story.emotional_response && story.emotional_response !== "unspecified") {
        // Provisional local classification fallback (non-blocking)
        const local = determineEmotionLocally(story.emotional_response);
        if (local !== "unknown") {
          feelingSentiment = local;
        }
      }

      // Format the story with its responses and sentiment
      return formatStoryResponse(
        story,
        storySliderResponses,
        storyParticipantResponses,
        storyTriangleResponses,
        feelingSentiment,
        hasPersistedSentiment
      );
    });

    return formattedStories as Story[];
  } catch (error) {
    debugError("STORY SERVICE - Error in fetchStoriesForProject:", error);
    throw error;
  }
};
