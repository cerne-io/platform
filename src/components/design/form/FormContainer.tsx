
import React, { useEffect, useState } from "react";
import { ActivityFormData } from "@/types/activity";
import ActivityFormFields from "../ActivityFormFields";
import SaveButton from "../SaveButton";
import { debugLog } from "@/utils/debugLogger";

interface FormContainerProps {
  formData: ActivityFormData;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  phaseId: string;
  stepId: string;
  activityId: string;
  saving: boolean;
  isDirty?: boolean;
  onComplete?: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const FormContainer: React.FC<FormContainerProps> = ({
  formData,
  onInputChange,
  phaseId,
  stepId,
  activityId,
  saving,
  isDirty = false,
  onSubmit,
}) => {
  const [localFormData, setLocalFormData] = useState<ActivityFormData>({});

  // Update local form data when props change
  useEffect(() => {
    debugLog(`FormContainer: Updating local data for ${activityId} with:`, formData);
    setLocalFormData(formData);
  }, [formData, activityId]);

  // Track form data changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { id: string; value: number[] }) => {
    if ('target' in e) {
      const { name, value } = e.target;
      setLocalFormData(prev => ({
        ...prev,
        [name]: value
      }));
      onInputChange(e);
    } else {
      // Handle custom change event (e.g. from sliders)
      const { id, value } = e;
      const optimizedValue = Array.isArray(value) ? JSON.stringify(value) : String(value);
      setLocalFormData(prev => ({
        ...prev,
        [id]: optimizedValue
      }));
      // Note: onInputChange prop doesn't support custom events yet, so we only update local state
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <ActivityFormFields
        formData={localFormData}
        onChange={handleChange}
        phaseId={phaseId}
        stepId={stepId}
        activityId={activityId}
      />

      <div className="flex justify-end mt-4">
        <SaveButton saving={saving} isDirty={isDirty} />
      </div>
    </form>
  );
};

export default FormContainer;
