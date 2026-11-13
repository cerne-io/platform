import { STORAGE_KEYS } from "@/services/constants/storageKeys";
// Extend existing types file with our new types

export interface ActivityFormData {
  [key: string]: string;
}

export interface QuestionField {
  id: string;
  label: string;
  isTextarea?: boolean;
}

// Helper functions for activity completion check
export const isActivityComplete = (
  activityId: string,
  activityData?: ActivityFormData,
  projectId?: string
): boolean => {
  // Special case for story-questions activity
  if (activityId === "story-questions") {
    return projectId ? localStorage.getItem(STORAGE_KEYS.STORY_QUESTION_SAVED(projectId)) === 'true' : false;
  }

  // Special case for slider-questions activity
  if (activityId === "slider-questions") {
    return projectId ? localStorage.getItem(STORAGE_KEYS.SLIDER_THEMES_SAVED(projectId)) === 'true' : false;
  }

  // Special case for participant-questions activity
  if (activityId === "participant-questions") {
    // First check the localStorage flag
    const isSaved = projectId ? localStorage.getItem(STORAGE_KEYS.PARTICIPANT_QUESTIONS_SAVED(projectId)) === 'true' : false;

    if (isSaved) {
      return true;
    }

    // If the flag isn't set but we have activity data, also consider it complete
    // This handles cases where the questions were saved but the flag wasn't set
    if (activityData && typeof activityData === 'object') {
      const keys = Object.keys(activityData);
      return keys.length > 0 && Object.values(activityData).some(value => value && value.trim() !== '');
    }

    return false;
  }

  // For regular activities, check if there's activity data with content
  return Boolean(
    activityData &&
    Object.keys(activityData).length > 0 &&
    Object.values(activityData).some(value => value && value.trim() !== '')
  );
};

// Find the first incomplete activity in a list
export const findFirstIncompleteActivity = (
  activities: Array<{ id: string; title: string; description: string }>,
  activityData: { [key: string]: ActivityFormData },
  projectId?: string
) => {
  return activities.find(activity => !isActivityComplete(activity.id, activityData[activity.id], projectId));
};
