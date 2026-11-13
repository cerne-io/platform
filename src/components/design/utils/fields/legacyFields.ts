import { debugWarn } from "@/utils/debugLogger";
import { ActivityField } from "./types";

/**
 * Legacy function to get activity fields based on step and activity IDs
 * @deprecated Use getQuestionFields instead
 */
export const getActivityFields = (stepId: string, activityId: string): ActivityField[] => {
  // Log deprecation warning
  debugWarn('getActivityFields is deprecated. Please use getQuestionFields instead.');

  // Topic Step
  if (stepId === "topic") {
    if (activityId === "investigate") {
      return [{ id: "investigation_topic", label: "Response", isTextarea: false }];
    } else if (activityId === "focus") {
      return [{ id: "topic_focus", label: "Response", isTextarea: false }];
    } else if (activityId === "actors") {
      return [{ id: "actors_involved", label: "Response", isTextarea: false }];
    }
  }
  // Discover Step
  else if (stepId === "discover") {
    if (activityId === "hopes") {
      return [{ id: "discovery_goal", label: "Response", isTextarea: false }];
    } else if (activityId === "experiences") {
      return [{ id: "experience_types", label: "Response", isTextarea: true }];
    } else if (activityId === "factors") {
      return [{ id: "influencing_factors", label: "Response", isTextarea: true }];
    }
  }

  return [];
};
