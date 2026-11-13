import React, { useMemo } from "react";
import { Accordion } from "@/components/ui/accordion";
import ActivityItem from "./ActivityItem";
import { ActivityFormData, findFirstIncompleteActivity } from "@/types/activity";
import { DesignActivity } from "@/data/types/designTypes";
import { useOptionalProject } from "@/contexts/ProjectContext";

interface ActivityListProps {
  phaseId: string;
  stepId: string;
  activities: DesignActivity[];
  activityData: { [key: string]: ActivityFormData };
  onStartActivity: (activityId: string) => void;
  isTemplateProject?: boolean;
  completedActivities?: Set<string>;
  onActivitySaved: (activityId: string) => void;
}

const ActivityList: React.FC<ActivityListProps> = ({
  phaseId,
  stepId,
  activities,
  activityData,
  isTemplateProject = false,
  completedActivities,
  onActivitySaved
}) => {
  const projectId = useOptionalProject()?.activeProject?.id;

  // Find the first incomplete activity using our utility function
  const firstIncompleteActivity = useMemo(() => {
    return findFirstIncompleteActivity(activities, activityData, projectId);
  }, [activities, activityData, projectId]);

  // Default value: if there's an incomplete activity, open it; otherwise keep all collapsed
  const defaultOpenValue = firstIncompleteActivity ? firstIncompleteActivity.id : undefined;

  const isActivityComplete = (activityId: string): boolean => {
    // If we have explicit completion data, use it
    if (completedActivities) {
      // Special case for question-type activity
      if (activityId === 'question-type') {
        return completedActivities.has('question-type');
      }

      // Special case for form-questions activity (can be slider OR triangle)
      if (activityId === 'form-questions') {
        return completedActivities.has('slider-questions') || completedActivities.has('triangle-questions');
      }

      // Special case for form-languages (always complete by default)
      if (activityId === 'form-languages-editor') {
        return true;
      }

      // Special case for participant-questions activity
      if (activityId === 'participant-questions') {
        return completedActivities.has('participant-questions');
      }

      return completedActivities.has(activityId);
    }

    // Fallback to checking if data exists in activityData (legacy behavior)
    return !!(activityData[activityId] && Object.keys(activityData[activityId]).length > 0);
  };

  return (
    <Accordion type="single" collapsible defaultValue={defaultOpenValue}>
      {activities.map(activity => (
        <ActivityItem
          key={activity.id}
          phaseId={phaseId}
          stepId={stepId}
          activity={activity}
          activityData={activityData[activity.id]}
          isTemplateProject={isTemplateProject}
          projectId={projectId}
          status={isActivityComplete(activity.id) ? "complete" : "incomplete"}
          onActivitySaved={onActivitySaved}
        />
      ))}
    </Accordion>
  );
};

export default ActivityList;
