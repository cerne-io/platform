import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { debugLog } from "@/utils/debugLogger";
import { FormDataState } from '@/types/formTypes';
import type { PublicFormData } from '@/services/publicForm/types';
import { ParticipantQuestion } from "@/services/types/designTypes";
import { safeParseStoryQuestion } from "@/utils/formLocalization";
import { formLanguageService, DEFAULT_LANGUAGES } from '@/services/formLanguageService';
import { ProjectLanguages } from '@/constants/languages';
import { getPreferNotToSayLabel } from '@/utils/formDefaultTranslations';

/**
 * Helper to dynamically inject "Prefer not to say" into participant question choices
 */
const injectPreferNotToSay = (questions: ParticipantQuestion[], includePreferNotToSay: boolean, lang?: string): ParticipantQuestion[] => {
  if (!includePreferNotToSay) return questions;

  const preferLabel = getPreferNotToSayLabel(lang);

  return questions.map(q => {
    if (q.includePreferNotToSay === false) return q;
    if (q.choices && q.choices.length > 0) {
      const hasPreferNotToSay = q.choices.some(c => c.id === 'prefer-not-to-say');
      if (!hasPreferNotToSay) {
        return {
          ...q,
          choices: [
            ...q.choices,
            { id: 'prefer-not-to-say', label: preferLabel }
          ]
        };
      }
    }
    return q;
  });
};

/**
 * Query key factory for form data
 */
export const formDataQueryKey = (projectId: string | null, isPublic: boolean = false, formId?: string | null) =>
  ['formData', projectId, isPublic ? 'public' : 'authenticated', formId ?? null] as const;

/**
 * Fetches project form data (authenticated)
 */
const fetchProjectFormData = async (projectId: string): Promise<FormDataState> => {
  const { getStoryQuestionWithSync } = await import('@/services/designOutputService');
  const { getSliderQuestionsWithSync } = await import('@/services/designOutputService');
  const { getParticipantQuestionsWithSync } = await import('@/services/sync/participantQuestionsSyncService');
  const { getTriangleQuestionsWithSync } = await import('@/services/sync/triangleQuestionsSyncService');
  const { getQuestionType } = await import('@/services/formConfig/questionTypeService');

  // Fetch question type, questions, language configuration, and builder questions in parallel
  const [
    questionType,
    storyQuestion,
    participantQuestionsData,
    languages,
    sliderQuestions,
    triangleQuestions,
    builderRow
  ] = await Promise.all([
    getQuestionType(projectId),
    getStoryQuestionWithSync(projectId),
    getParticipantQuestionsWithSync(projectId),
    formLanguageService.getLanguageConfig(projectId),
    getSliderQuestionsWithSync(projectId),
    getTriangleQuestionsWithSync(projectId, false),
    (async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('activity_responses')
        .select('ar_response')
        .eq('ar_project_id', projectId)
        .eq('ar_activity_id', 'form-builder-questions')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(1);
      return data?.[0] ? { data: data[0] } : { data: null };
    })()
  ]);

  debugLog(`[useFormDataQuery] Question type for project ${projectId}: ${questionType || 'not set (backward compatibility mode)'}`);

  const participantQuestions = injectPreferNotToSay(
    participantQuestionsData?.questions || [],
    participantQuestionsData?.includePreferNotToSay ?? true,
    languages?.defaultLanguage
  );

  const rawBuilderResponse = builderRow?.data?.ar_response;
  const formBuilderQuestions: import('@/components/design/form-builder/types').CerneBuilderQuestion[] | undefined =
    Array.isArray(rawBuilderResponse)
      ? (rawBuilderResponse as unknown as import('@/components/design/form-builder/types').CerneBuilderQuestion[])
      : Array.isArray((rawBuilderResponse as Record<string, unknown>)?.questions)
      ? ((rawBuilderResponse as Record<string, unknown>).questions as unknown as import('@/components/design/form-builder/types').CerneBuilderQuestion[])
      : Array.isArray((rawBuilderResponse as Record<string, unknown>)?.formBuilderQuestions)
      ? ((rawBuilderResponse as Record<string, unknown>).formBuilderQuestions as unknown as import('@/components/design/form-builder/types').CerneBuilderQuestion[])
      : undefined;

  const emotionalResponseQuestion = formBuilderQuestions?.find(
    (q) => q.type === 'emotional-response'
  ) || null;

  return {
    storyQuestion: safeParseStoryQuestion(storyQuestion || ""),
    sliderQuestions: sliderQuestions || [],
    participantQuestions: participantQuestions || [],
    triangleQuestions: triangleQuestions || [],
    questionType: questionType || 'slider',
    languages: languages || DEFAULT_LANGUAGES,
    formDesigned: true,
    isLoading: false,
    formBuilderQuestions,
    emotionalResponseQuestion,
  };
};

const EMPTY_PUBLIC_FORM_DATA: FormDataState = {
  storyQuestion: "",
  sliderQuestions: [],
  participantQuestions: [],
  triangleQuestions: [],
  languages: DEFAULT_LANGUAGES,
  formDesigned: false,
  isLoading: false,
};

export function toFormDataState(publicFormData: PublicFormData): FormDataState {
  const processedParticipantQuestions = injectPreferNotToSay(
    publicFormData.participantQuestions || [],
    publicFormData.includePreferNotToSay ?? true,
    publicFormData.languages?.defaultLanguage
  );

  return {
    storyQuestion: safeParseStoryQuestion(publicFormData.storyQuestion || ""),
    sliderQuestions: publicFormData.sliderQuestions || [],
    participantQuestions: processedParticipantQuestions,
    triangleQuestions: publicFormData.triangleQuestions || [],
    questionType: publicFormData.questionType || 'slider',
    languages: (publicFormData.languages as ProjectLanguages) || DEFAULT_LANGUAGES,
    formDesigned: true,
    isLoading: false,
    formBuilderQuestions: publicFormData.formBuilderQuestions,
    emotionalResponseQuestion: publicFormData.emotionalResponseQuestion || null,
  };
}

async function fetchFromSupabaseFallback(projectId: string, formId?: string | null): Promise<FormDataState> {
  debugLog("[useFormDataQuery] Fetching from Supabase directly...");
  const { getPublicForm } = await import('@/services/publicFormService');
  const publicFormData = await getPublicForm(projectId, formId);

  debugLog("useFormDataQuery - fetchPublicFormData result:", {
    hasData: !!publicFormData,
    triangleQuestionsCount: publicFormData?.triangleQuestions?.length || 0,
    hasLanguages: !!publicFormData?.languages
  });

  if (!publicFormData) {
    return {
      ...EMPTY_PUBLIC_FORM_DATA,
      error: "No form data found"
    };
  }

  return toFormDataState(publicFormData);
}

/**
 * Fetches public form data directly from the local backend / database
 */
const fetchPublicFormData = async (projectId: string, formId?: string | null): Promise<FormDataState> => {
  if (!formId) {
    // Public views without a formId (e.g. PublicDashboard) must not call admin-only /api/db/query
    return EMPTY_PUBLIC_FORM_DATA;
  }
  return fetchFromSupabaseFallback(projectId, formId);
};

/**
 * TanStack Query hook for fetching form data
 *
 * @param projectId - The project ID to fetch form data for
 * @param isPublic  - Whether to fetch public form data (default: false)
 * @param formId    - For public forms: the form identifier from the URL. Used to
 *                    scope the Supabase fallback read via get_public_form_config.
 * @param options   - Additional query options
 *
 * @example
 * ```tsx
 * const { data } = useFormDataQuery(projectId, true, formId);
 * ```
 */
export const useFormDataQuery = (
  projectId: string | null | undefined,
  isPublic: boolean = false,
  formId?: string | null,
  options?: Omit<UseQueryOptions<FormDataState>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<FormDataState>({
    queryKey: formDataQueryKey(projectId ?? null, isPublic, formId),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      return isPublic
        ? fetchPublicFormData(projectId, formId)
        : fetchProjectFormData(projectId);
    },
    enabled: !!projectId && !(isPublic && !formId) && (options?.enabled !== false),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
    ...options
  });
};
