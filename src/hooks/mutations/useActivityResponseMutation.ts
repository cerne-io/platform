import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveActivityResponse as saveActivityResponseOperation } from '@/services/supabaseSync/operations';
import { activityResponseQueryKey } from '@/hooks/queries/useActivityResponseQuery';
import { useToast } from '@/components/ui/use-toast';
import { debugError } from "@/utils/debugLogger";
import { getSignedOut } from '@/utils/auth/signedOutFlag';

/**
 * Variables for activity response mutation
 */
export interface ActivityResponseMutationVariables<T = unknown> {
  phaseId: string;
  stepId: string;
  activityId: string;
  data: T;
  responseKey?: string | null;
}

/**
 * Options for useActivityResponseMutation
 */
export interface UseActivityResponseMutationOptions {
  onSuccess?: (success: boolean, variables: ActivityResponseMutationVariables) => void;
  onError?: (error: Error, variables: ActivityResponseMutationVariables) => void;
  showToast?: boolean;
}

/**
 * TanStack Query mutation hook for saving activity responses
 * 
 * @param projectId - The project ID
 * @param options - Mutation options
 */
export const useActivityResponseMutation = (
  projectId: string | undefined,
  options?: UseActivityResponseMutationOptions
) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { showToast = true } = options || {};

  return useMutation<boolean, Error, ActivityResponseMutationVariables>({
    mutationFn: async (variables: ActivityResponseMutationVariables): Promise<boolean> => {
      if (!projectId) {
        debugError('[ActivityResponseMutation] Project ID is required');
        return false;
      }

      const { phaseId, stepId, activityId, data, responseKey = null } = variables;

      return await saveActivityResponseOperation(
        projectId,
        phaseId,
        stepId,
        activityId,
        data,
        responseKey
      );
    },
    onSuccess: (success, variables) => {
      if (getSignedOut()) return;
      if (success) {
        // Invalidate the specific activity response query
        void queryClient.invalidateQueries({
          queryKey: activityResponseQueryKey(
            projectId,
            variables.phaseId,
            variables.stepId,
            variables.activityId,
            variables.responseKey
          )
        });

        // Also invalidate without responseKey to catch all variations
        void queryClient.invalidateQueries({
          queryKey: activityResponseQueryKey(
            projectId,
            variables.phaseId,
            variables.stepId,
            variables.activityId
          )
        });

        if (showToast) {
          toast({
            title: "Saved",
            description: "Your changes have been saved successfully.",
          });
        }

        options?.onSuccess?.(success, variables);
      } else {
        if (showToast) {
          toast({
            title: "Save Failed",
            description: "There was an error saving your changes.",
            variant: "destructive",
          });
        }
      }
    },
    onError: (error: Error, variables) => {
      if (getSignedOut()) return;
      debugError('[ActivityResponseMutation] Error:', error);

      if (showToast) {
        toast({
          title: "Error",
          description: `Failed to save: ${error.message}`,
          variant: "destructive",
        });
      }

      options?.onError?.(error, variables);
    },
  });
};

