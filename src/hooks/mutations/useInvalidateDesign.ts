import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { formDataQueryKey } from '@/hooks/queries/useFormDataQuery';
import { activityCompletionQueryKey } from '@/hooks/queries/useActivityCompletionQuery';
import { formAppearanceQueryKey } from '@/hooks/queries/useFormAppearanceQuery';
import { debugLog } from '@/utils/debugLogger';

/**
 * Hook to invalidate design-related queries when design elements are updated.
 * This ensures that /form and /collect pages fetch the latest data.
 */
export const useInvalidateDesign = () => {
    const queryClient = useQueryClient();

    const invalidateDesign = useCallback((projectId: string | undefined) => {
        if (!projectId) return;

        debugLog(`[useInvalidateDesign] Invalidating design queries for project ${projectId}`);

        // Invalidate Form Data (Story, Sliders, Triangles, Participants)
        void queryClient.invalidateQueries({ queryKey: formDataQueryKey(projectId, false) });
        void queryClient.invalidateQueries({ queryKey: formDataQueryKey(projectId, true) });

        // Invalidate Form Appearance
        void queryClient.invalidateQueries({ queryKey: formAppearanceQueryKey(projectId) });

        // Invalidate Activity Completion
        void queryClient.invalidateQueries({ queryKey: activityCompletionQueryKey(projectId) });
    }, [queryClient]);

    return invalidateDesign;
};

