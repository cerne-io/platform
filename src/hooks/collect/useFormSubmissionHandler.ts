
import { useState, useCallback } from 'react';
import { StoryData, FormSubmissionHandler } from './form-submission/types';
import { submitPublicForm } from './form-submission/publicSubmissionHandler';
import { submitAuthenticatedForm } from './form-submission/authenticatedSubmissionHandler';
import { useToast } from '@/components/ui/use-toast';
import { debugLog, debugError } from '@/utils/debugLogger';

/**
 * Hook for handling form submissions
 * @param isPublic Whether this is a public form submission
 * @param projectId The ID of the project this submission belongs to
 * @returns Object with submission handler and state
 */
export const useFormSubmissionHandler = (isPublic: boolean = false, projectId?: string) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const { toast } = useToast();

  const handleFormSubmit: FormSubmissionHandler = useCallback(async (data: StoryData) => {
    if (isSubmitting) return false;

    try {
      setIsSubmitting(true);

      // Make sure we have the project ID in the data
      const submissionData = {
        ...data,
        projectId: data.projectId || projectId
      };

      debugLog("Form submission handler starting with data:", {
        title: submissionData.title,
        text: submissionData.text.substring(0, 30) + "...",
        emotion: submissionData.emotionalResponse,
        isPublic,
        projectId: submissionData.projectId,
        sliderResponseCount: submissionData.sliderResponses?.length || 0,
        participantResponseCount: submissionData.participantResponses?.length || 0
      });

      // Choose the appropriate submission handler based on whether this is a public form
      const submitFn = isPublic ? submitPublicForm : submitAuthenticatedForm;

      const result = await submitFn(submissionData);

      if (result === true || typeof result === 'string') {
        toast({
          title: isPublic ? "Story submitted" : "Success!",
          description: isPublic 
            ? "Thank you for sharing your story!" 
            : "Your story has been submitted successfully.",
        });
        setSubmissionComplete(true);
        return true;
      } else {
        toast({
          title: "Submission failed",
          description: "There was a problem submitting your story. Please try again.",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      debugError('Error submitting form:', error);
      toast({
        title: "Submission error",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [isPublic, isSubmitting, toast, projectId]);

  return {
    handleFormSubmit,
    isSubmitting,
    submissionComplete,
  };
};
