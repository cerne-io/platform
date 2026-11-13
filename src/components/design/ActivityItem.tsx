import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Play, Circle, CheckCircle } from "lucide-react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ActivityFormData, isActivityComplete } from "@/types/activity";
import ActivityContent from "./ActivityContent";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import ActivityForm from "./ActivityForm";
import { useOptionalProject } from "@/contexts/ProjectContext";

interface DesignActivity {
  id: string;
  title: string;
  description: string;
  component?: React.ReactNode;
  hideActivityContent?: boolean;
}

interface ActivityItemProps {
  phaseId: string;
  stepId: string;
  activity: DesignActivity;
  activityData: ActivityFormData | undefined;
  status?: "complete" | "incomplete" | "in_progress" | "error";
  isTemplateProject?: boolean;
  projectId?: string;
  onActivitySaved: (activityId: string) => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  phaseId,
  stepId,
  activity,
  activityData,
  status = "incomplete",
  projectId: projectIdProp,
  onActivitySaved
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const contextProjectId = useOptionalProject()?.activeProject?.id;
  const projectId = projectIdProp || contextProjectId;

  const isCompleted = isActivityComplete(activity.id, activityData, projectId);
  const finalCompletionStatus = status === 'complete' || isCompleted;

  return (
    <AccordionItem key={activity.id} value={activity.id} className="border border-gray-100 dark:border-white/5 mb-3 bg-white dark:bg-[#161B22] rounded-lg px-4 shadow-sm">
      <AccordionTrigger className="hover:text-primary dark:text-gray-200 [&[data-state=open]_.hide-on-open]:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-left">
          <div className="flex items-center gap-2">
            {finalCompletionStatus ? (
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
            )}
            <span className="flex items-center gap-1 font-semibold">
              {activity.title}
              {activity.id === "story-questions" && (
                <InfoTooltip contentKey="design-story-question" size={14} />
              )}
            </span>
          </div>
          <span className="text-base font-normal text-gray-500 dark:text-gray-400 hidden sm:inline-block">-</span>
          <span className="text-base font-normal text-gray-500 dark:text-gray-400">
            {activity.description}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="px-4 pb-4 pt-0 rounded-md">
          {isEditing ? (
            <div className="mt-4">
              <ActivityForm
                phaseId={phaseId}
                stepId={stepId}
                activityId={activity.id}
                activityTitle={activity.title}
                activityDescription={activity.description}
                onComplete={() => setIsEditing(false)}
                onSaved={() => {
                  setIsEditing(false);
                  onActivitySaved(activity.id);
                }}
                initialEditMode={true}
              />
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="dark:text-gray-400 dark:hover:text-white">Cancel Editing</Button>
              </div>
            </div>
          ) : (
            <>
              {finalCompletionStatus && activityData ? (
                <ActivityContent
                  activityData={activityData}
                  onEdit={() => setIsEditing(true)}
                  hideContent={activity.hideActivityContent}
                  phaseId={phaseId}
                  stepId={stepId}
                  activityId={activity.id}
                />
              ) : null}

              {activity.component && (
                <div className="mt-4">
                  {activity.component}
                </div>
              )}

              {!finalCompletionStatus && !activity.component && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className={activityData && Object.keys(activityData).length > 0 ?
                      "text-primary border-primary flex items-center gap-1" :
                      "text-primary-foreground bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 flex items-center gap-1"}
                    onClick={() => setIsEditing(true)}
                  >
                    {activityData && Object.keys(activityData).length > 0 ? (
                      <>
                        <Pencil size={14} />
                        Edit this Activity
                      </>
                    ) : (
                      <>
                        <Play size={14} color="white" />
                        Start this activity
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export default ActivityItem;
