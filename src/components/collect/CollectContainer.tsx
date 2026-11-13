import React, { useEffect } from "react";
import CollectHeader from "@/components/collect/CollectHeader";
import { useProject } from "@/contexts/ProjectContext";
import FormLoadingState from "./FormLoadingState";
import ShareFormSection from "./ShareFormSection";
import { useNavigate } from "react-router-dom";
import { useFormDesignValidation } from "@/hooks/collect/useFormDesignValidation";
import FormDesignRequired from "./FormDesignRequired";
import { debugLog } from "@/utils/debugLogger";

const CollectContainer: React.FC = () => {
  const { activeProject } = useProject();
  const projectId = activeProject?.id || null;
  const navigate = useNavigate();

  // If no project is selected, redirect to the projects page
  useEffect(() => {
    if (!activeProject) {
      debugLog("CollectContainer: No active project detected");
      navigate("/projects");
    }
  }, [activeProject, navigate]);

  // Lightweight validation - no full data fetch needed
  const {
    hasFormIntegrity,
    hasStoryQuestion,
    hasSliderQuestions,
    hasTriangleQuestions,
    hasParticipantQuestions,
    integrityErrors,
    integrityWarnings,
    isLoading: isValidating
  } = useFormDesignValidation(projectId);

  // Show loading state while validating form design
  if (isValidating) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <CollectHeader />
        <FormLoadingState />
      </div>
    );
  }

  // If form doesn't have integrity (missing required elements), show the design required component
  if (!hasFormIntegrity) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <CollectHeader />
        <FormDesignRequired
          hasStoryQuestion={hasStoryQuestion}
          hasSliderQuestions={hasSliderQuestions}
          hasTriangleQuestions={hasTriangleQuestions}
          hasParticipantQuestions={hasParticipantQuestions}
          integrityErrors={integrityErrors}
          integrityWarnings={integrityWarnings}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <CollectHeader />

      {projectId && (
        <ShareFormSection
          integrityWarnings={integrityWarnings}
        />
      )}
    </div>
  );
};

export default CollectContainer;
