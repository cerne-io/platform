
import React, { useState, useEffect } from "react";
import { FormProvider } from "@/contexts/form";
import { useSynchronizedFormData } from "@/hooks/collect/useSynchronizedFormData";
import { useFormSubmissionHandler } from "@/hooks/collect/useFormSubmissionHandler";
import FormLoadingState from "@/components/collect/FormLoadingState";
import StoryForm from "@/components/collect/StoryForm";
import FormErrorState from "./FormErrorState";
import { StoryData } from "@/hooks/collect/form-submission/types";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { FormErrorFallback } from "@/components/ui/form-error-fallback";
import { FormAppearance } from "@/components/design/form-appearance/types";
import { debugLog } from "@/utils/debugLogger";
import { filterQuestionsByType } from "@/utils/filterQuestionsByType";
import { 
  localizeStoryQuestion, 
  localizeSliderQuestion, 
  localizeTriangleQuestion, 
  localizeParticipantQuestion 
} from "@/utils/formLocalization";

interface PublicFormContainerProps {
  formId?: string | null;
  projectId?: string | null;
  formAppearance?: FormAppearance | null;
  activeLang?: string;
}

/**
 * Container for public form that uses synchronized form data and appearance
 */
const PublicFormContainer: React.FC<PublicFormContainerProps> = ({
  formId,
  projectId,
  formAppearance,
  activeLang = 'en'
}) => {
  const [showDebug, setShowDebug] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const isAdmin = Boolean(useAuth().user);
  const [formReady, setFormReady] = useState(false);

  // Only attempt to load data if we have a valid project ID
  // Pass formId so useSynchronizedFormData → useFormDataQuery can call get_public_form_config(formId)
  // instead of the unscoped direct table queries.
  const formData = useSynchronizedFormData(projectId ?? null, true, formId);
  const { handleFormSubmit } = useFormSubmissionHandler(true, projectId || undefined);

  // Use provided appearance if available, otherwise use the one from synchronized data
  const appearance = formAppearance || formData.appearance;

  // Add a slight delay before showing the form to prevent UI flashing
  useEffect(() => {
    if (!formData.isLoading && projectId) {
      const timer = setTimeout(() => {
        setFormReady(true);
      }, 200);

      return () => clearTimeout(timer);
    } else {
      setFormReady(false);
    }
  }, [formData.isLoading, projectId]);

  // Log detailed form state to help debug data synchronization issues.
  useEffect(() => {
    debugLog("PublicFormContainer - Form data loaded:", {
      hasStoryQuestion: !!formData.storyQuestion,
      storyQuestion: formData.storyQuestion ? (typeof formData.storyQuestion === 'string' ? formData.storyQuestion.substring(0, 50) : JSON.stringify(formData.storyQuestion).substring(0, 50)) : 'none',
      sliderQuestionsCount: formData.sliderQuestions?.length || 0,
      participantQuestionsCount: formData.participantQuestions?.length || 0,
      triangleQuestionsCount: formData.triangleQuestions?.length || 0,
      triangleQuestionsType: Array.isArray(formData.triangleQuestions) ? 'array' : typeof formData.triangleQuestions,
      isLoading: formData.isLoading,
      hasAppearance: !!appearance,
      formReady,
    });
    if (formData.triangleQuestions && !Array.isArray(formData.triangleQuestions)) {
      debugLog("PublicFormContainer - ⚠️ ERROR: triangleQuestions is NOT an array!", formData.triangleQuestions);
    }
  }, [formData, appearance, refreshTrigger, formReady]);

  // Function to force refreshing the form data
  const handleRefresh = () => {
    debugLog("Forcing refresh of public form data");
    void formData.reloadFromRemote();
    setRefreshTrigger(prev => prev + 1);
  };

  // Don't return anything if no projectId (parent component should handle this state)
  if (!projectId) {
    return null;
  }

  // Show loading state while form data is loading
  if (formData.isLoading || !formReady) {
    return <FormLoadingState />;
  }

  if (formData.error) {
    return <FormErrorState error={formData.error} />;
  }

  // Create a wrapper for the onSubmit function to adapt the types
  const handleSubmit = async (data: StoryData): Promise<boolean> => {
    // Add the project ID and form ID to the data
    const submissionData = {
      ...data,
      projectId: projectId || undefined,
      formId: formId || undefined
    };

    debugLog("Public form submitting with project ID and form ID:", {
      projectId: submissionData.projectId,
      formId: submissionData.formId
    });
    debugLog("Public form submission data:", {
      hasText: !!submissionData.text,
      hasTitle: !!submissionData.title,
      sliderResponsesCount: submissionData.sliderResponses?.length || 0,
      participantResponsesCount: submissionData.participantResponses?.length || 0
    });

    const result = await handleFormSubmit(submissionData);
    return result === true;
  };

  // Toggle debug information
  const toggleDebug = () => setShowDebug(!showDebug);

  return (
    <div className="w-full mx-auto">
      {/* Debug and refresh controls - only visible to superadmins */}
      {process.env.NODE_ENV !== 'production' && isAdmin && (
        <div className="mb-4 flex flex-wrap gap-2 justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDebug}
            className="text-xs bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
          >
            {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh Form Data
          </Button>
        </div>
      )}

      {/* Debug information panel - only visible when showDebug is true and user is superadmin */}
      {showDebug && isAdmin && (
        <div className="mt-2 mb-4 bg-yellow-50 p-4 rounded border border-yellow-300 text-xs overflow-auto max-h-[300px]">
          <h3 className="font-bold mb-2">Public Form Debug Information (Unified Loader)</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p><strong>Form ID:</strong> {formId || 'Not provided'}</p>
              <p><strong>Project ID:</strong> {projectId || 'Not provided'}</p>
              <p><strong>Story Question:</strong> {typeof formData.storyQuestion === 'object' ? JSON.stringify(formData.storyQuestion) : (formData.storyQuestion || 'None')}</p>
            </div>
            <div>
              <p><strong>Slider Questions:</strong> {formData.sliderQuestions?.length || 0}</p>
              <p><strong>Participant Questions:</strong> {formData.participantQuestions?.length || 0}</p>
              <p><strong>Triangle Questions:</strong> {formData.triangleQuestions?.length || 0}</p>
              <p><strong>Is Loading:</strong> {formData.isLoading ? 'Yes' : 'No'}</p>
              <p><strong>Error:</strong> {formData.error || 'None'}</p>
            </div>
          </div>

          {/* Appearance Debug Section */}
          <div className="mt-2 pt-2 border-t border-yellow-300">
            <h4 className="font-semibold">Form Appearance:</h4>
            {appearance ? (
              <div className="grid grid-cols-2 gap-2">
                <p><strong>Header:</strong> {typeof appearance.headerText === 'object' ? JSON.stringify(appearance.headerText).substring(0, 50) : (appearance.headerText || 'None')}</p>
                <p><strong>Subheader:</strong> {typeof appearance.subheaderText === 'object' 
                  ? JSON.stringify(appearance.subheaderText).substring(0, 30) + '...'
                  : (appearance.subheaderText?.substring(0, 30) + (appearance.subheaderText?.length > 30 ? '...' : ''))}
                </p>
                <p><strong>Has Logo:</strong> {appearance.logoUrl ? 'Yes' : 'No'}</p>
              </div>
            ) : (
              <p className="text-red-500">No appearance data available!</p>
            )}
          </div>

          {(!formData.sliderQuestions || formData.sliderQuestions.length === 0) &&
            (!formData.participantQuestions || formData.participantQuestions.length === 0) && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Missing Form Elements</AlertTitle>
                <AlertDescription>
                  No slider or participant questions were loaded. This could indicate a synchronization issue
                  or that the form hasn't been fully configured yet.
                </AlertDescription>
              </Alert>
            )}

          {formData.sliderQuestions && formData.sliderQuestions.length > 0 && (
            <div className="mt-2">
              <h4 className="font-semibold">Slider Questions:</h4>
              <ul className="list-disc pl-5">
                {formData.sliderQuestions.map((q, idx) => (
                  <li key={idx}>{q.question?.substring(0, 40) || 'No question text'} (ID: {q.id})</li>
                ))}
              </ul>
            </div>
          )}

          {formData.participantQuestions && formData.participantQuestions.length > 0 && (
            <div className="mt-2">
              <h4 className="font-semibold">Participant Questions:</h4>
              <ul className="list-disc pl-5">
                {formData.participantQuestions.map((q, idx) => (
                  <li key={idx}>{q.label?.substring(0, 40) || 'No label'} (ID: {q.id})</li>
                ))}
              </ul>
            </div>
          )}

          {formData.triangleQuestions && formData.triangleQuestions.length > 0 && (
            <div className="mt-2">
              <h4 className="font-semibold">Triangle Questions:</h4>
              <ul className="list-disc pl-5">
                {formData.triangleQuestions.map((q, idx) => (
                  <li key={idx}>{q.question?.substring(0, 40) || 'No question text'} (ID: {q.id})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <ErrorBoundary
        fallback={
          <FormErrorFallback
            title="Form Error"
            message="There was a problem with the form. Please try reloading the page."
            resetError={handleRefresh}
          />
        }
      >
        <FormProvider
          key={`${activeLang}-${formData.emotionalResponseQuestion?.options?.map(o => `${o.id}:${o.label}`).join('|') || ''}`}
          initialValues={{
            storyQuestion: formData.storyQuestion ? localizeStoryQuestion(formData.storyQuestion, activeLang, 'public.interview.fallbackStoryQuestion') : "",
            ...filterQuestionsByType(
              (Array.isArray(formData.sliderQuestions) ? formData.sliderQuestions : []).map(q => localizeSliderQuestion(q, activeLang)),
              (Array.isArray(formData.triangleQuestions) ? formData.triangleQuestions : []).map(q => localizeTriangleQuestion(q, activeLang)),
              formData.questionType
            ),
            participantQuestions: (Array.isArray(formData.participantQuestions) ? formData.participantQuestions : []).map(q => localizeParticipantQuestion(q, activeLang)),
            emotionalResponseQuestion: formData.emotionalResponseQuestion,
            activeLang,
          }}
          onSubmit={handleSubmit}
        >
          <StoryForm isPublic={true} appearance={appearance} />
        </FormProvider>
      </ErrorBoundary>
    </div>
  );
};

export default PublicFormContainer;
