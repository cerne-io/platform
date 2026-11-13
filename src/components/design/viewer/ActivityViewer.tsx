
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import ActivityForm from "../ActivityForm";

import { debugLog } from "@/utils/debugLogger";

interface ActivityViewerProps {
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

const ActivityViewer: React.FC<ActivityViewerProps> = ({
  phaseId,
  stepId,
  activity,
  onBackToActivities,
  onActivitySaved,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);


  const handleActivitySaved = () => {
    debugLog(`Activity ${activity.id} saved, notifying parent component`);

    // Notify parent component
    onActivitySaved(activity.id);



    // Force refresh the activity form
    setRefreshKey(prev => prev + 1);

    // Success notification is already handled by ActivityForm

    // Set a timeout to refresh again after a short delay to ensure data is updated
    setTimeout(() => {
      setRefreshKey(prev => prev + 1);
    }, 500);
  };

  return (
    <div className="space-y-8">
      <Card className="border-border shadow-sm bg-card dark:bg-[#161B22] dark:border-white/10">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-muted dark:from-[#161B22] dark:to-[#161B22]">
          <h3 className="text-xl font-semibold text-foreground">
            {activity.title}
          </h3>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <ActivityForm
            key={`activity-form-${refreshKey}`}
            phaseId={phaseId}
            stepId={stepId}
            activityId={activity.id}
            activityTitle={activity.title}
            activityDescription={activity.description}
            onComplete={onBackToActivities}
            onSaved={handleActivitySaved}
          />

          <div className="pt-4 border-t border-gray-100">
            <Button
              variant="ghost"
              onClick={onBackToActivities}
              className="flex items-center gap-2 text-primary hover:bg-muted dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5"
            >
              <ArrowLeft size={16} />
              Back to activities
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityViewer;
