
import { useCallback } from "react";
import { defaultAppearance } from "@/components/design/form-appearance/types";
import { toast } from "@/components/ui/use-toast";
import { useFormDataQuery, formDataQueryKey } from "@/hooks/queries/useFormDataQuery";
import { useFormAppearanceQuery, formAppearanceQueryKey } from "@/hooks/queries/useFormAppearanceQuery";
import { useQueryClient } from "@tanstack/react-query";
import { debugLog, debugError } from "@/utils/debugLogger";

/**
 * Combines form data and appearance data loading into a single synchronous process
 * @param projectId Project ID to load data for
 * @param isPublic Whether this is a public form
 * @param formId   For public forms: the form identifier from the URL (required to scope anon reads)
 */
export function useSynchronizedFormData(projectId: string | null, isPublic: boolean = false, formId?: string | null) {
  const queryClient = useQueryClient();

  // Load form data with TanStack Query
  const {
    data: formData,
    isLoading: isFormDataLoading,
    error: formDataError
  } = useFormDataQuery(projectId, isPublic, formId);

  // Load form appearance with TanStack Query
  const {
    data: loadedAppearance,
    isLoading: isAppearanceLoading,
    error: appearanceError
  } = useFormAppearanceQuery(projectId, formId);

  // Combine loading states
  const isLoading = isFormDataLoading || isAppearanceLoading;

  // Appearance is already sanitized in useFormAppearanceQuery (blob URLs removed)
  const appearance = loadedAppearance || defaultAppearance;

  // Function to reload data from remote
  const reloadFromRemote = useCallback(async () => {
    if (!projectId) return;

    try {
      debugLog("Forcing reload of synchronized form data and appearance");

      // Clear and refetch both queries
      queryClient.removeQueries({ queryKey: formDataQueryKey(projectId, isPublic, formId) });
      queryClient.removeQueries({ queryKey: formAppearanceQueryKey(projectId, formId) });

      await Promise.all([
        queryClient.refetchQueries({ queryKey: formDataQueryKey(projectId, isPublic, formId) }),
        queryClient.refetchQueries({ queryKey: formAppearanceQueryKey(projectId, formId) })
      ]);

      toast({
        title: "Refreshed",
        description: "Form data and appearance refreshed from database"
      });
    } catch (error) {
      debugError("Error reloading form data:", error);
    }
  }, [projectId, isPublic, formId, queryClient]);

  // Refresh function (invalidate without clearing)
  const refreshFormData = useCallback(async () => {
    if (!projectId) return;

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: formDataQueryKey(projectId, isPublic, formId) }),
      queryClient.invalidateQueries({ queryKey: formAppearanceQueryKey(projectId, formId) })
    ]);
  }, [projectId, isPublic, formId, queryClient]);

  // Return combined data
  return {
    storyQuestion: formData?.storyQuestion || "",
    sliderQuestions: Array.isArray(formData?.sliderQuestions) ? formData.sliderQuestions : [],
    participantQuestions: Array.isArray(formData?.participantQuestions) ? formData.participantQuestions : [],
    triangleQuestions: Array.isArray(formData?.triangleQuestions) ? formData.triangleQuestions : [],
    questionType: formData?.questionType || null,
    formDesigned: formData?.formDesigned || false,
    appearance,
    isLoading,
    error: formDataError ? (formDataError as Error).message : formData?.error,
    appearanceError: appearanceError ? (appearanceError as Error).message : null,
    hasBlobUrl: false, // TanStack Query version already sanitizes blob URLs
    formBuilderQuestions: formData?.formBuilderQuestions,
    emotionalResponseQuestion: formData?.emotionalResponseQuestion || null,
    reloadFromRemote,
    refreshFormData
  };
}
