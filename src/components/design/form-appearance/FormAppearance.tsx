import { debugError, debugWarn, debugLog } from "@/utils/debugLogger";
import React, { useEffect } from "react";
import i18n from "@/i18n";
import { useProjectLanguages } from "@/hooks/queries/useProjectLanguages";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useProject } from "@/contexts/ProjectContext";
import FormErrorAlert from "./FormErrorAlert";
import { useFormAppearanceEditor } from "./hooks/useFormAppearanceEditor";
import type { FormAppearance as FormAppearanceData } from "./types";
import AuthWarning from "./components/AuthWarning";
import AppearanceEditorHeader from "./components/AppearanceEditorHeader";
import DescriptionText from "./components/DescriptionText";
import FormAppearanceUI from "./components/FormAppearanceUI";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompletionState } from "@/hooks/useCompletionState";
import { useInvalidateActivityCompletion } from "@/hooks/mutations/useInvalidateActivityCompletion";

const FormAppearance: React.FC = () => {
  const { activeProject } = useProject();
  const isAdmin = Boolean(useAuth().user);
  const invalidateActivityCompletion = useInvalidateActivityCompletion();

  // Load all project languages to ensure translations are available for fallback display
  const { data: languages } = useProjectLanguages(activeProject?.id);
  useEffect(() => {
    if (languages?.enabledLanguages && languages.enabledLanguages.length > 0) {
      debugLog("[FormAppearance] Loading project languages:", languages.enabledLanguages);
      void i18n.loadLanguages(languages.enabledLanguages);
    }
  }, [languages]);

  const {
    appearance,
    isLoading,
    isSaving,
    isAuthenticated,
    authChecked,
    appearanceError,
    canSaveChanges,
    handleSave,
    handleReset,
    handleBackgroundColorChange,
    handleHeaderTextChange,
    handleSubheaderTextChange,
    projectId
  } = useFormAppearanceEditor(activeProject?.id);

  // Check if this is a template project and user is not a superadmin, or if user is a viewer
  const isTemplateProject = activeProject?.is_template || false;
  const { currentUserProjectRole } = useProject();
  const isReadOnly = (isTemplateProject && !isAdmin) || currentUserProjectRole === 'viewer';

  // Completion state tracking
  const { markCompleted } = useCompletionState({
    projectId: activeProject?.id,
    phase: 'build',
    step: 'form-appearance',
    activity: 'form-appearance-editor'
  });

  // Enhanced save handler with proper state management and debugging
  const handleEnhancedSave = async () => {
    // Debug authentication status first
    await supabase.auth.getUser();

    // Show a toast to indicate saving is in progress
    toast({
      title: "Saving...",
      description: "Saving your form appearance settings"
    });

    const success = await handleSave();

    if (success) {
      // Mark activity as completed
      await markCompleted();

      // Trigger sidebar refresh
      if (activeProject?.id) {
        invalidateActivityCompletion(activeProject.id);
      }

      // Verify the save actually happened with a direct database check
      setTimeout(() => {
        void (async () => {
          try {
            const { data, error } = await supabase
              .from('activity_responses')
              .select('ar_response, updated_at')
              .eq('ar_project_id', activeProject?.id || '')
              .eq('ar_phase_id', 'build')
              .eq('ar_step_id', 'form-appearance')
              .eq('ar_activity_id', 'form-appearance-editor')
              .order('updated_at', { ascending: false })
              .limit(1)
              .single();

            if (error) {
              debugError("Error verifying save:", error);
            } else {
              // Check if the data matches what we tried to save
              const arResponse = data?.ar_response;

              // Handle potential string response or direct object
              let responseObj: unknown = arResponse;
              if (typeof arResponse === 'string') {
                try {
                  responseObj = JSON.parse(arResponse);
                } catch (e) {
                  debugError("Could not parse ar_response as JSON:", e);
                  responseObj = null;
                }
              }

              if (typeof responseObj === 'object' && responseObj !== null) {
                // Use Partial<FormAppearanceData> for type safety
                const responseData = responseObj as Partial<FormAppearanceData>;
                // Helper to normalize text to object format for comparison
                const normalize = (val: unknown) => {
                  if (!val) return JSON.stringify({ en: "" });
                  if (typeof val === 'string') return JSON.stringify({ en: val });
                  return JSON.stringify(val);
                };

                const dbHeaderStr = normalize(responseData.headerText);
                const currentHeaderStr = normalize(appearance.headerText);
                const dbSubheaderStr = normalize(responseData.subheaderText);
                const currentSubheaderStr = normalize(appearance.subheaderText);

                if (dbHeaderStr !== currentHeaderStr || dbSubheaderStr !== currentSubheaderStr) {
                   debugWarn(`Save verification mismatch! 
                     DB Header: "${dbHeaderStr}", Tried to save Header: "${currentHeaderStr}"
                     DB Subheader: "${dbSubheaderStr}", Tried to save Subheader: "${currentSubheaderStr}"`);
                }
              }
            }
          } catch (err) {
            debugError("Error in save verification:", err);
          }
        })();
      }, 1500); 
    }

    return success;
  };

  return (
    <Card className="bg-white dark:bg-[#161B22] shadow-sm border border-gray-100 dark:border-white/10">
      <CardHeader className="pb-2">
        <AppearanceEditorHeader />
        {isReadOnly && (
          <div className="bg-blue-50 text-blue-700 rounded p-3 mt-2 text-sm">
            <p className="font-semibold">{isTemplateProject ? "Template View Mode" : "Read Only Mode"}</p>
            <p>You can view but not modify the form appearance settings {isTemplateProject ? "for this template project" : "as a viewer"}.</p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="-mt-1">
          <DescriptionText />
        </div>

        <AuthWarning
          isAuthenticated={isAuthenticated}
          authChecked={authChecked}
        />

        <FormErrorAlert error={appearanceError} />

        <FormAppearanceUI
          appearance={appearance}
          isLoading={isLoading}
          isSaving={isSaving}
          projectId={projectId}
          canSaveChanges={canSaveChanges}
          onColorChange={handleBackgroundColorChange}
          onHeaderChange={handleHeaderTextChange}
          onSubheaderChange={handleSubheaderTextChange}
          onSave={() => void handleEnhancedSave()}
          onReset={handleReset}
        />
      </CardContent>
    </Card>
  );
};

export default FormAppearance;
