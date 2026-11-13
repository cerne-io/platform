import { debugError } from "@/utils/debugLogger";

/**
 * Formats a story response from the database into a standardized format for the UI
 */
export const formatStoryResponse = (
  story: Record<string, unknown>,
  sliderResponses: unknown[] = [],
  participantResponses: unknown[] = [],
  triangleResponses: unknown[] = [],
  preClassifiedSentiment?: "positive" | "negative" | "neutral",
  hasPersistedSentiment: boolean = false
) => {
  // Construct the formatted story object
  const storyTitle = (story.title as string) || "Untitled Story";
  const rawStoryText = (story.text as string) || "";
  const additionalComments = (story.additional_comments as string) || "";

  const formattedStory = {
    id: story.id,
    title: storyTitle,
    text: cleanStoryText(rawStoryText, storyTitle, additionalComments),
    feeling: (story.emotional_response as string) || "unspecified",
    feelingSentiment: preClassifiedSentiment, // Use pre-classified sentiment if available
    hasPersistedSentiment,
    date: story.created_at,
    isPublic: !!story.is_public,
    isImported: !!story.is_imported,
    additional_comments: additionalComments,
    has_audio: Boolean(story.has_audio),
    audio_url: (story.audio_url as string) || null,
    created_at: story.created_at as string | undefined,
    updated_at: story.updated_at as string | undefined,
    project_id: (story.st_project_id || story.project_id) as string | undefined,

    // Format and add slider responses
    sliderResponses: sliderResponses.map(response => {
      const r = response as Record<string, unknown>;
      return {
        id: r.id,
        question_id: r.question_id,
        question_text: (r.question_text as string) || "Unnamed Question",
        value: r.value,
        response_type: r.value === null ? "skipped" : "answered" as "skipped" | "answered",
        left_label: (r.left_label as string) || "",
        right_label: (r.right_label as string) || ""
      };
    }),

    // Format and add participant responses
    participantResponses: participantResponses.map(response => {
      const r = response as Record<string, unknown>;
      let parsedVal = r.response;
      if (typeof r.response === 'string' && (r.response.startsWith('[') || r.response.startsWith('{'))) {
        try {
          parsedVal = JSON.parse(r.response);
        } catch {
          parsedVal = r.response;
        }
      }
      return {
        id: r.id,
        question_id: r.question_id,
        question_text: (r.question_text as string) || "Unnamed Question",
        response: (parsedVal !== undefined && parsedVal !== null ? parsedVal : (r.response as string) || "") as string | string[]
      };
    }),

    // Format and add triangle responses
    triangleResponses: triangleResponses.map(response => {
      const r = response as Record<string, unknown>;
      return {
        id: r.id,
        question_id: r.question_id,
        question_text: (r.question_text as string) || "Unnamed Question",
        x_position: r.x_position,
        y_position: r.y_position,
        response_type: (r.x_position === null || r.y_position === null) ? "skipped" : "answered" as "skipped" | "answered",
        top_label: (r.top_label as string) || "",
        bottom_left_label: (r.bottom_left_label as string) || "",
        bottom_right_label: (r.bottom_right_label as string) || ""
      };
    })
  };

  return formattedStory;
};

// Get color for feeling badge
export const getFeelingColor = (feeling: string): string => {
  const lowerFeeling = feeling.toLowerCase();

  if (lowerFeeling.includes("happy") || lowerFeeling.includes("positive") || lowerFeeling.includes("good")) {
    return "bg-green-100 text-green-800 hover:bg-green-100";
  } else if (lowerFeeling.includes("sad") || lowerFeeling.includes("negative") || lowerFeeling.includes("bad")) {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  } else if (lowerFeeling.includes("neutral")) {
    return "bg-blue-100 text-blue-800 hover:bg-blue-100";
  }

  // Default color
  return "bg-gray-100 text-gray-800 hover:bg-gray-100";
};

// Format date for display
export const formatDate = (dateString: string): string => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    };
    return date.toLocaleDateString(undefined, options);
  } catch (error) {
    debugError("Error formatting date:", error);
    return dateString;
  }
};

// Format date in short format
export const formatShortDate = (dateString: string): string => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateUTCStr = date.toISOString().slice(0, 10);
    const todayUTCStr = today.toISOString().slice(0, 10);
    const yesterdayUTCStr = yesterday.toISOString().slice(0, 10);

    // Check if the date is today
    if (dateUTCStr === todayUTCStr) {
      return "Today";
    }

    // Check if the date is yesterday
    if (dateUTCStr === yesterdayUTCStr) {
      return "Yesterday";
    }

    // Otherwise, return a short date format
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  } catch (error) {
    debugError("Error formatting short date:", error);
    return dateString;
  }
};

// Format date in YYYY-MM-DD format for CSV export
export const formatDateYYYYMMDD = (dateString: string): string => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    debugError("Error formatting date for CSV:", error);
    return dateString;
  }
};

// Format date as Month Day for story cards
export const formatMonthDay = (dateString: string): string => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  } catch (error) {
    debugError("Error formatting month day:", error);
    return dateString;
  }
};

/**
 * Strips title and/or additional comments from story text if they were accidentally
 * concatenated at the beginning or end of the narrative.
 */
export const cleanStoryText = (
  text: string,
  title?: string,
  additionalComments?: string
): string => {
  if (!text) return "";
  let cleaned = text.trim();

  // 1. Strip title from the beginning if present
  if (title && title.trim()) {
    const escapedTitle = title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const leadingTitleRegex = new RegExp(`^${escapedTitle}[\\s\\n]*`, 'i');
    cleaned = cleaned.replace(leadingTitleRegex, '').trim();
  }

  // 2. Strip additional comments from the end if present
  if (additionalComments && additionalComments.trim()) {
    const escapedComments = additionalComments.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const trailingCommentsRegex = new RegExp(`[\\s\\n]*${escapedComments}$`, 'i');
    cleaned = cleaned.replace(trailingCommentsRegex, '').trim();
  }

  // 3. Strip title from the end if present (e.g. after trailing comments were stripped)
  if (title && title.trim()) {
    const escapedTitle = title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const trailingTitleRegex = new RegExp(`[\\s\\n]*${escapedTitle}$`, 'i');
    cleaned = cleaned.replace(trailingTitleRegex, '').trim();
  }

  // 4. In case comments were stripped and revealed another trailing comment occurrence
  if (additionalComments && additionalComments.trim()) {
    const escapedComments = additionalComments.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const trailingCommentsRegex = new RegExp(`[\\s\\n]*${escapedComments}$`, 'i');
    cleaned = cleaned.replace(trailingCommentsRegex, '').trim();
  }

  // Safety: if stripping removed everything (e.g. text was only the title), return original text
  if (!cleaned && text.trim()) {
    return text.trim();
  }

  return cleaned;
};
