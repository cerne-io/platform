
import React from "react";
import { useActivityForm } from "@/hooks/useActivityForm";

import LoadingIndicator from "./LoadingIndicator";
import FormErrorState from "./form/FormErrorState";
import FormContainer from "./form/FormContainer";


interface ActivityFormProps {
  phaseId: string;
  stepId: string;
  activityId: string;
  activityTitle: string;
  activityDescription: string;
  onComplete?: () => void;
  onSaved?: () => void;
  initialEditMode?: boolean;
}

const ActivityForm: React.FC<ActivityFormProps> = ({
  phaseId,
  stepId,
  activityId,
  onComplete,
  onSaved,
  initialEditMode = false
}) => {
  const {
    formData,
    isLoading,
    loading,
    saving,
    isDirty,
    handleInputChange,
    handleSubmit,
    activeProject
  } = useActivityForm({
    phaseId,
    stepId,
    activityId,
    onSaved,
    initialEditMode
  });

  if (!activeProject) {
    return <FormErrorState />;
  }

  return (
    <div className="space-y-6">

      {(loading || isLoading) ? (
        <LoadingIndicator message="Loading activity data..." />
      ) : (
        <FormContainer
          formData={formData}
          onInputChange={handleInputChange}
          phaseId={phaseId}
          stepId={stepId}
          activityId={activityId}
          saving={saving}
          isDirty={isDirty}
          onComplete={onComplete}
          onSubmit={(e) => { void handleSubmit(e); }}
        />
      )}
    </div>
  );
};

export default ActivityForm;
