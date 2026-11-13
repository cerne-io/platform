
import React from "react";
import ActivityViewer from "../viewer/ActivityViewer";

interface ActivityViewProps {
  phaseId: string;
  stepId: string;
  activity: {
    id: string;
    title: string;
    description: string;
  };
  onBackToActivities: () => void;
  onActivitySaved: (activityId: string) => void;
}

const ActivityView: React.FC<ActivityViewProps> = ({
  phaseId,
  stepId,
  activity,
  onBackToActivities,
  onActivitySaved,
}) => {
  return (
    <ActivityViewer
      phaseId={phaseId}
      stepId={stepId}
      activity={activity}
      onBackToActivities={onBackToActivities}
      onActivitySaved={onActivitySaved}
    />
  );
};

export default ActivityView;
