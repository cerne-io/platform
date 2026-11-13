import { useCallback } from "react";
import { debugLog } from "@/utils/debugLogger";
import { FormDataState } from "@/types/formTypes";
import { FormAppearance } from "@/components/design/form-appearance/types";
import { useFormDataQuery } from "@/hooks/queries/useFormDataQuery";
import { useFormAppearanceQuery } from "@/hooks/queries/useFormAppearanceQuery";
import { useQueryClient } from "@tanstack/react-query";
import { formDataQueryKey } from "@/hooks/queries/useFormDataQuery";
import { formAppearanceQueryKey } from "@/hooks/queries/useFormAppearanceQuery";

/**
 * Return type matching form data expectations
 */
export interface FormDataWithQueryResult extends FormDataState {
  appearance: FormAppearance;
  isLoading: boolean;
  refreshFormData: () => Promise<void>;
  reloadFromRemote: () => void;
  fetchProjectFormData: (projectId: string) => Promise<FormDataState>;
  fetchLocalFormData: () => Promise<FormDataState>;
  handleFetchError: (error: unknown) => FormDataState;
}

/**
 * Hook for form data loading using TanStack Query
 * 
 * @param projectId - Project ID to load form data for
 * @param isPublic - Whether to load public form data
 * @returns Form data with operations
 */
export function useFormDataWithQuery(
  projectId: string | null,
  isPublic: boolean = false
): FormDataWithQueryResult {
  const queryClient = useQueryClient();

  // Fetch form data using TanStack Query
  const {
    data: formData,
    isLoading: isFormDataLoading,
    error: formDataError
  } = useFormDataQuery(projectId, isPublic);

  // Fetch form appearance using TanStack Query
  const {
    data: appearance,
    isLoading: isAppearanceLoading
  } = useFormAppearanceQuery(projectId);

  // Combine loading states
  const isLoading = isFormDataLoading || isAppearanceLoading;

  // Refresh form data by invalidating queries
  const refreshFormData = useCallback(async () => {
    if (!projectId) return;

    debugLog(`[useFormDataWithQuery] Refreshing form data for project ${projectId}`);

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: formDataQueryKey(projectId, isPublic)
      }),
      queryClient.invalidateQueries({
        queryKey: formAppearanceQueryKey(projectId)
      })
    ]);
  }, [projectId, isPublic, queryClient]);

  // Force reload from remote by clearing cache and refetching
  const reloadFromRemote = useCallback(() => {
    if (!projectId) return;

    debugLog(`[useFormDataWithQuery] Force reloading from remote for project ${projectId}`);

    // Remove queries from cache to force fresh fetch
    queryClient.removeQueries({
      queryKey: formDataQueryKey(projectId, isPublic)
    });
    queryClient.removeQueries({
      queryKey: formAppearanceQueryKey(projectId)
    });

    // Refetch immediately
    void queryClient.refetchQueries({
      queryKey: formDataQueryKey(projectId, isPublic)
    });
    void queryClient.refetchQueries({
      queryKey: formAppearanceQueryKey(projectId)
    });
  }, [projectId, isPublic, queryClient]);

  // Utility functions for backward compatibility
  const fetchProjectFormData = useCallback(async (pid: string): Promise<FormDataState> => {
    const data = await queryClient.fetchQuery({
      queryKey: formDataQueryKey(pid, false),
      queryFn: async () => {
        const { getStoryQuestionWithSync } = await import('@/services/designOutputService');
        const { getSliderQuestions } = await import('@/services/sliderQuestionsService');
        const { getParticipantQuestionsWithSync } = await import('@/services/sync/participantQuestionsSyncService');

        const [storyQuestion, participantQuestionsData] = await Promise.all([
          getStoryQuestionWithSync(pid),
          getParticipantQuestionsWithSync(pid)
        ]);
        const sliderQuestions = getSliderQuestions(pid);

        const participantQuestions = participantQuestionsData?.questions || [];

        return {
          storyQuestion: storyQuestion || "",
          sliderQuestions: sliderQuestions || [],
          participantQuestions: participantQuestions || [],
          triangleQuestions: [],
          formDesigned: true,
          isLoading: false
        };
      }
    });
    return data;
  }, [queryClient]);

  const fetchLocalFormData = useCallback(async (): Promise<FormDataState> => {
    return {
      storyQuestion: "",
      sliderQuestions: [],
      participantQuestions: [],
      triangleQuestions: [],
      formDesigned: false,
      isLoading: false
    };
  }, []);

  const handleFetchError = useCallback((error: unknown): FormDataState => {
    const errorMessage = error instanceof Error ? error.message : "Failed to load form data";
    return {
      storyQuestion: "",
      sliderQuestions: [],
      participantQuestions: [],
      triangleQuestions: [],
      formDesigned: false,
      isLoading: false,
      error: errorMessage
    };
  }, []);

  // Prepare return value with fallbacks
  const result: FormDataWithQueryResult = {
    storyQuestion: formData?.storyQuestion || "",
    sliderQuestions: formData?.sliderQuestions || [],
    participantQuestions: formData?.participantQuestions || [],
    triangleQuestions: formData?.triangleQuestions || [],
    questionType: formData?.questionType || null,
    formDesigned: formData?.formDesigned || false,
    isLoading,
    error: formDataError ? (formDataError as Error).message : formData?.error,
    appearance: appearance || { backgroundColor: "#ffffff", logoUrl: "", headerText: "", subheaderText: "" },
    refreshFormData,
    reloadFromRemote,
    fetchProjectFormData,
    fetchLocalFormData,
    handleFetchError,
    formBuilderQuestions: formData?.formBuilderQuestions,
    emotionalResponseQuestion: formData?.emotionalResponseQuestion || null,
  };

  return result;
}
