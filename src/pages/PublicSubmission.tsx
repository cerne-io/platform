
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageLayout from "@/components/layout/PageLayout";
import { useProjectIdResolver } from "@/hooks/collect/useProjectIdResolver";
import { useFormAppearanceQuery } from "@/hooks/queries/useFormAppearanceQuery";
import { useAuth } from "@/contexts/AuthContext";
import { useTimeout } from "@/hooks/useTimeout";

import FormErrorDisplay from "@/components/public/form/FormErrorDisplay";
import FormCard from "@/components/public/form/FormCard";

const PublicSubmission = () => {
  const { formId } = useParams();
  const [isReady, setIsReady] = useState(false);
  const isAdmin = Boolean(useAuth().user);

  // Use the project ID resolver to get the project ID from the form ID
  const {
    projectId,
    loading: resolvingProjectId,
    error: projectResolutionError
  } = useProjectIdResolver(true, formId);

  // Load form appearance settings using TanStack Query
  const { data: appearance, isLoading } = useFormAppearanceQuery(projectId, formId);
  const debugInfo = isAdmin ? { projectId, appearance } : undefined;

  // Only set ready state after project resolution and appearance loading is complete
  // Add a slight delay to ensure everything is ready and prevent flashing
  const isLoaded = !resolvingProjectId && !isLoading && Boolean(projectId);

  useEffect(() => {
    if (!isLoaded) {
      setIsReady(false);
    }
  }, [isLoaded]);

  useTimeout(() => {
    setIsReady(true);
  }, isLoaded ? 500 : null);

  // Show an error message if there was a problem resolving the project ID
  if (!isLoading && projectResolutionError && !resolvingProjectId) {
    return (
      <PageLayout simplified allowMobile>
        <div className="flex items-center justify-center min-h-full py-8 px-4">
          <div className="w-full max-w-4xl">
            <FormErrorDisplay
              error={projectResolutionError}
              debugInfo={isAdmin ? debugInfo : undefined}
            />
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout simplified allowMobile noPadding>
      {/* Main form card — handles its own full-page background + centered white card */}
      <FormCard
        formId={formId}
        projectId={projectId}
        appearance={appearance || null}
        isReady={isReady}
      />
    </PageLayout>
  );
};

export default PublicSubmission;
