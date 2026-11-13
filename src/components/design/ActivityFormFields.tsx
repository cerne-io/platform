
import React from "react";
import { ActivityFormData } from "@/types/activity";
import { getQuestionFields } from "./utils/fields";
import ActivityFieldRenderer from "./ActivityFieldRenderer";
import { debugLog } from "@/utils/debugLogger";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ActivityFormFieldsProps {
  formData: ActivityFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { id: string; value: number[] }) => void;
  phaseId: string;
  stepId: string;
  activityId: string;
}

const ActivityFormFields: React.FC<ActivityFormFieldsProps> = ({
  formData,
  onChange,
  phaseId,
  stepId,
  activityId
}) => {
  // Get the fields for this specific activity
  const fields = getQuestionFields(phaseId, stepId, activityId);

  // Debug output to see what fields we're getting
  debugLog(`Fields for ${phaseId}/${stepId}/${activityId}:`, fields);
  debugLog(`Current form data:`, formData);

  // Handle field value change
  const handleFieldChange = (fieldId: string, value: string) => {
    const eventLike = {
      target: {
        name: fieldId,
        value: value
      }
    } as React.ChangeEvent<HTMLInputElement>;

    onChange(eventLike);
  };

  const handleModeChange = (fieldId: string, mode: "list" | "text") => {
    const eventLike = {
      target: {
        name: `${fieldId}_mode`,
        value: mode
      }
    } as React.ChangeEvent<HTMLInputElement>;

    onChange(eventLike);
  };

  // If no fields are defined for this activity, show a message
  if (fields.length === 0) {
    return (
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No form fields are configured for this activity. Please define them in formFieldUtils.ts
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 bg-transparent p-0 rounded-md">
      {fields.map((field) => (
        <ActivityFieldRenderer
          key={field.id}
          field={field}
          value={formData[field.id] || ""}
          onChange={(value) => handleFieldChange(field.id, value)}
          activityId={activityId}
          mode={(formData[`${field.id}_mode`] as "list" | "text") || (field.isList ? "list" : undefined)}
          onModeChange={(mode) => handleModeChange(field.id, mode)}
        />
      ))}
    </div>
  );
};

export default ActivityFormFields;
