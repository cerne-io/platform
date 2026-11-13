import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { FormAppearance, defaultAppearance, validateAppearanceData } from '@/components/design/form-appearance/types';
import { supabase } from '@/integrations/supabase/client';
import { isPlainObject } from '@/services/publicForm/types';
import { debugError } from "@/utils/debugLogger";

/**
 * Query key factory for form appearance
 */
export const formAppearanceQueryKey = (projectId: string | null, formId?: string | null) =>
  ['formAppearance', projectId, formId] as const;

/**
 * Fetches form appearance data from Supabase
 */
export const fetchFormAppearance = async (projectId: string, formId?: string | null): Promise<FormAppearance> => {
  let responseData: unknown = null;

  if (formId) {
    const { data, error } = await supabase.rpc('get_public_form_config', {
      p_form_id: formId
    });

    if (error) {
      debugError('[useFormAppearanceQuery] Error fetching public form appearance:', error);
      throw new Error(`Failed to load form appearance: ${error.message}`);
    }

    const rows = data as Record<string, unknown>[] | null;
    const row = rows?.find(
      (ar) =>
        ar.ar_step_id === 'form-appearance' &&
        ar.ar_activity_id === 'form-appearance-editor'
    );
    responseData = row?.ar_response;
  } else {
    const { data, error } = await supabase
      .from('activity_responses')
      .select('ar_response, updated_at')
      .eq('ar_project_id', projectId)
      .eq('ar_phase_id', 'build')
      .eq('ar_step_id', 'form-appearance')
      .eq('ar_activity_id', 'form-appearance-editor')
      .maybeSingle();

    if (error && !data) {
      debugError('[useFormAppearanceQuery] Error fetching form appearance:', error);
      throw new Error(`Failed to load form appearance: ${error.message}`);
    }
    responseData = data?.ar_response;
  }

  if (!responseData || !isPlainObject(responseData)) {
    return defaultAppearance;
  }

  // Validate and sanitize using the shared helper which correctly handles multi-language objects
  const appearance = validateAppearanceData(responseData);

  // Special handling for logoUrl to avoid blob URLs from previous sessions
  const hasBlobUrl = typeof appearance.logoUrl === 'string' && appearance.logoUrl.startsWith('blob:');
  if (hasBlobUrl) {
    appearance.logoUrl = '';
  }

  return appearance;
};

/**
 * TanStack Query hook for fetching form appearance
 * 
 * @param projectId - The project ID to fetch form appearance for
 * @param formId - For public forms: the form identifier from the URL
 * @param options - Additional query options
 * @returns Query result with form appearance data
 * 
 * @example
 * ```tsx
 * const { data: appearance, isLoading, error } = useFormAppearanceQuery(projectId, formId);
 * ```
 */
export const useFormAppearanceQuery = (
  projectId: string | null | undefined,
  formId?: string | null,
  options?: Omit<UseQueryOptions<FormAppearance>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<FormAppearance>({
    queryKey: formAppearanceQueryKey(projectId ?? null, formId),
    queryFn: async () => {
      if (!projectId) {
        return defaultAppearance;
      }

      return fetchFormAppearance(projectId, formId);
    },
    enabled: !!projectId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
    placeholderData: defaultAppearance,
    ...options
  });
};
