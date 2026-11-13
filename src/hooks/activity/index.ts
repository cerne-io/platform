import { useActivityResponsesCore } from './useActivityResponsesCore';
import { useActivityResponsesFetch } from './useActivityResponsesFetch';
import { useActivityResponsesSave } from './useActivityResponsesSave';

// Re-export TanStack Query hooks as the new recommended approach
export { useActivityResponseQuery } from '@/hooks/queries/useActivityResponseQuery';
export { useActivityResponseMutation } from '@/hooks/mutations/useActivityResponseMutation';

/**
 * Combined hook for activity responses with both fetch and save functionality
 * 
 * @deprecated Use useActivityResponseQuery and useActivityResponseMutation instead
 * This hook is maintained for backward compatibility
 */
export const useActivityResponses = (projectId: string) => {
  const { fetchActivityResponse, loading } = useActivityResponsesFetch(projectId);
  const { saveActivityResponse, saving } = useActivityResponsesSave(projectId);

  return {
    fetchActivityResponse,
    saveActivityResponse,
    loading,
    saving
  };
};

export { useActivityResponsesCore, useActivityResponsesFetch, useActivityResponsesSave };
