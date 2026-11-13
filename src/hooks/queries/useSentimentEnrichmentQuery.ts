import { useQuery } from '@tanstack/react-query';
import { sentimentService, Sentiment } from '@/services/sentimentService';

export const CLASSIFIER_VERSION = 'v1';

export type AccessScope = 'authenticated' | 'public';

/**
 * Generates a deterministic, non-reversible, non-secret public share identifier from a token.
 * Prevents raw security tokens from appearing in TanStack Query keys, DevTools, or cache keys.
 */
export function getNonSecretShareId(token?: string): string {
  if (!token) return 'anonymous_share';
  let hash = 2166136261;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `share_${(hash >>> 0).toString(16)}`;
}

export const sentimentEnrichmentQueryKey = (
  accessScope: AccessScope,
  scopeIdentity: string | undefined,
  projectId: string | undefined,
  classifierVersion: string,
  sortedEmotions: string[]
) => ['sentimentEnrichment', accessScope, scopeIdentity || 'default', projectId, classifierVersion, sortedEmotions] as const;

interface UseSentimentEnrichmentQueryProps {
  projectId?: string;
  emotions: string[];
  accessScope?: AccessScope;
  scopeIdentity?: string;
  dashboardToken?: string;
}

export const useSentimentEnrichmentQuery = ({
  projectId,
  emotions,
  accessScope = 'authenticated',
  scopeIdentity,
  dashboardToken,
}: UseSentimentEnrichmentQueryProps) => {
  // Ensure array is sorted and deduplicated for stable query identity
  const sortedEmotions = Array.from(new Set(emotions)).sort();
  const effectiveScopeIdentity = scopeIdentity || (dashboardToken ? getNonSecretShareId(dashboardToken) : 'default');

  return useQuery<Map<string, Sentiment>, Error>({
    queryKey: sentimentEnrichmentQueryKey(accessScope, effectiveScopeIdentity, projectId, CLASSIFIER_VERSION, sortedEmotions),
    queryFn: ({ signal }) =>
      sentimentService.getBatchSentiments(sortedEmotions, {
        projectId,
        accessScope,
        scopeIdentity: effectiveScopeIdentity,
        dashboardToken,
        signal,
      }),
    enabled: !!projectId && sortedEmotions.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 60 minutes
    retry: 1, // Bounded retry to prevent expensive LLM call amplification
  });
};

