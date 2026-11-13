import { useQuery } from '@tanstack/react-query';
import { getProjectDashboardTokens } from '@/services/dashboardTokenService';

export const dashboardTokensQueryKey = (projectId: string | undefined) => 
  ['dashboard', 'tokens', projectId] as const;

// UUID validation regex to prevent 400 Bad Request errors on RPC
const isValidUUID = (id: string | undefined): boolean => {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const useDashboardTokensQuery = (projectId: string | undefined) => {
  return useQuery({
    queryKey: dashboardTokensQueryKey(projectId),
    queryFn: () => getProjectDashboardTokens(projectId!),
    enabled: isValidUUID(projectId),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};
