
import { supabase } from '@/integrations/supabase/client';
import { submitAuthenticatedStory } from './storyOperations';
import { StoryData } from './types';
import { FormSubmissionHandler } from './types';
import { validateStoryData, validateSliderResponses, validateParticipantResponses } from './validationSchemas';
import { debugLog, debugError } from "@/utils/debugLogger";

/**
 * Handles form submission for authenticated users
 * @param formData The form data to submit
 * @returns Promise resolving to true on success, false on failure, or string on special conditions
 */
export const submitAuthenticatedForm: FormSubmissionHandler = async (formData: StoryData): Promise<boolean | string> => {
  if (!formData) {
    debugError("No form data provided");
    return false;
  }

  try {
    debugLog("Submitting authenticated form with data:", {
      title: formData.title,
      text: formData.text?.substring(0, 50) + "...",
      emotionalResponse: formData.emotionalResponse,
      sliderResponseCount: formData.sliderResponses?.length || 0,
      triangleResponseCount: formData.triangleResponses?.length || 0,
      participantResponseCount: formData.participantResponses?.length || 0
    });


    // Validate and sanitize all inputs before submission
    try {
      const sanitizedData = validateStoryData(formData);

      // Validate responses if present
      if (formData.sliderResponses && formData.sliderResponses.length > 0) {
        formData.sliderResponses = validateSliderResponses(formData.sliderResponses) as unknown as typeof formData.sliderResponses;
      }

      if (formData.participantResponses && formData.participantResponses.length > 0) {
        formData.participantResponses = validateParticipantResponses(formData.participantResponses) as unknown as typeof formData.participantResponses;
      }

      // Update formData with sanitized values
      Object.assign(formData, sanitizedData);
    } catch (validationError) {
      debugError("Form validation failed:", validationError);
      throw new Error(validationError instanceof Error ? validationError.message : "Invalid form data");
    }

    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (userError || !userId) {
      debugError("User authentication error:", userError);
      return false;
    }

    const storyId = await submitAuthenticatedStory(formData, formData.projectId, userId);

    if (!storyId) {
      debugError("Failed to save story");
      return false;
    }

    return true;
  } catch (error) {
    debugError("Error in authenticated form submission:", error);
    return false;
  }
};
