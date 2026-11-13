import { useQuery } from '@tanstack/react-query';
import { useMemo, useContext } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { AuthContext } from '@/contexts/AuthContext';
import { fetchStoriesForProject } from '@/services/story/fetch/fetchStoriesForProject';
import { Story } from '@/types/story';
import { useSentimentEnrichmentQuery } from './useSentimentEnrichmentQuery';

export const storiesQueryKey = (projectId: string | undefined) => ['stories', projectId] as const;

export const storiesStructuralSharing = (oldData: unknown | undefined, newData: unknown | undefined): Story[] => {
  // ⚡ Bolt: O(N) Zero-Allocation Check.
  if (!oldData && !newData) return newData as Story[];
  if (!oldData || !newData) return newData as Story[];

  const oldStories = oldData as Story[];
  const newStories = newData as Story[];

  // Fast path: length check
  if (oldStories.length !== newStories.length) return newData as Story[];
  if (newStories.length === 0) return oldData as Story[];

  // O(N) Zero-Allocation Check:
  // Loop halts immediately at the first discrepancy avoiding GC spikes.
  for (let i = 0; i < oldStories.length; i++) {
    const o = oldStories[i];
    const n = newStories[i];

    if (
      o.id !== n.id ||
      (o.updated_at || o.created_at || o.date) !== (n.updated_at || n.created_at || n.date) ||
      o.text !== n.text ||
      o.title !== n.title ||
      o.feelingSentiment !== n.feelingSentiment
    ) {
      // Mismatch found; return new data to trigger a re-render
      return newData as Story[];
    }
  }

  // Arrays are identical by id, timestamp, text & sentiment; safely return referentially stable old data
  return oldData as Story[];
};

export const useStoriesQuery = () => {
  const { activeProject } = useProject();
  const projectId = activeProject?.id;
  const authContext = useContext(AuthContext);
  const accountScopeIdentity = authContext?.user?.id || 'authenticated_user';

  // 1. Base stories query (non-blocking, resolves stories and response data immediately)
  const baseResult = useQuery<Story[], Error>({
    queryKey: storiesQueryKey(projectId),
    queryFn: ({ signal }) => fetchStoriesForProject(projectId, signal),
    enabled: !!projectId,
    refetchInterval: 120_000, // Auto-refresh every 2 minutes
    structuralSharing: storiesStructuralSharing
  });

  const baseStories = baseResult.data;

  // 2. Identify emotions requiring background canonical analysis (lacking persisted DB sentiment)
  const uncachedEmotions = useMemo(() => {
    if (!baseStories || baseStories.length === 0) return [];
    const set = new Set<string>();
    for (let i = 0; i < baseStories.length; i++) {
      const s = baseStories[i];
      // Only enrich if no valid persisted sentiment in DB
      if (!s.hasPersistedSentiment && s.feeling && s.feeling !== 'unspecified') {
        set.add(s.feeling);
      }
    }
    return Array.from(set).sort();
  }, [baseStories]);

  // 3. Background enrichment query (runs asynchronously without driving base loading/error states)
  const enrichmentResult = useSentimentEnrichmentQuery({
    projectId,
    emotions: uncachedEmotions,
    accessScope: 'authenticated',
    scopeIdentity: accountScopeIdentity,
  });

  const enrichmentMap = enrichmentResult.data;

  // 4. Derived stories with merged canonical sentiment
  const derivedStories = useMemo(() => {
    if (!baseStories) return undefined;
    if (!enrichmentMap || enrichmentMap.size === 0) return baseStories;

    let hasAnyUpdates = false;
    const enriched = baseStories.map(story => {
      // Persisted DB sentiment takes strict precedence over background enrichment
      if (story.hasPersistedSentiment) return story;

      const canonical = enrichmentMap.get(story.feeling);
      if (canonical && canonical !== story.feelingSentiment) {
        hasAnyUpdates = true;
        return {
          ...story,
          feelingSentiment: canonical,
        };
      }
      return story;
    });

    return hasAnyUpdates ? enriched : baseStories;
  }, [baseStories, enrichmentMap]);

  return {
    ...baseResult,
    data: derivedStories,
    enrichment: {
      isLoading: enrichmentResult.isLoading,
      isError: enrichmentResult.isError,
      error: enrichmentResult.error,
    },
  };
};

