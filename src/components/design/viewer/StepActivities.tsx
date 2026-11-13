
import React from "react";
import ActivityList from "../ActivityList";
import { ActivityFormData } from "@/types/activity";
import { DesignActivity } from "@/data/types/designTypes";

interface StepActivitiesProps {
  phaseId: string;
  stepId: string;
  activities: DesignActivity[];
  activityData: { [key: string]: ActivityFormData };
  onStartActivity: (activityId: string) => void;
  isTemplateProject: boolean;
  completedActivities?: Set<string>;
  onActivitySaved: (activityId: string) => void;
}

const StepActivities: React.FC<StepActivitiesProps> = ({
  phaseId,
  stepId,
  activities,
  activityData,
  onStartActivity,
  isTemplateProject,
  completedActivities,
  onActivitySaved,
}) => {
  return (
    <ActivityList
      phaseId={phaseId}
      stepId={stepId}
      activities={activities}
      activityData={activityData}
      onStartActivity={onStartActivity}
      isTemplateProject={isTemplateProject}
      completedActivities={completedActivities}
      onActivitySaved={onActivitySaved}
    />
  );
};

export default StepActivities;
