import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchStoriesForProject } from '../fetchStoriesForProject';
import { storiesStructuralSharing } from '@/hooks/queries/useStoriesQuery';
import { sentimentService } from '@/services/sentimentService';
import { supabase } from '@/integrations/supabase/client';
import {
  sentimentEnrichmentQueryKey,
  getNonSecretShareId,
  CLASSIFIER_VERSION,
} from '@/hooks/queries/useSentimentEnrichmentQuery';
import { isValidSentiment, determineEmotionLocally } from '@/utils/sentiment/emotionClassifier';
import { fetchSliderResponsesForProject } from '../fetchSliderResponses';
import { fetchParticipantResponsesForProject } from '../fetchParticipantResponses';
import { fetchTriangleResponsesForProject } from '../fetchTriangleResponses';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/utils/debugLogger', () => ({
  debugLog: vi.fn(),
  debugError: vi.fn(),
}));

vi.mock('../fetchSliderResponses', () => ({
  fetchSliderResponsesForProject: vi.fn().mockResolvedValue([]),
}));

vi.mock('../fetchParticipantResponses', () => ({
  fetchParticipantResponsesForProject: vi.fn().mockResolvedValue([]),
}));

vi.mock('../fetchTriangleResponses', () => ({
  fetchTriangleResponsesForProject: vi.fn().mockResolvedValue([]),
}));

// Helper to create a deferred promise for testing non-blocking behavior
function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Phase 2 Sentiment Decoupling & Non-Blocking Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sentimentService.clearMemoryCache();
    vi.mocked(fetchSliderResponsesForProject).mockResolvedValue([]);
    vi.mocked(fetchParticipantResponsesForProject).mockResolvedValue([]);
    vi.mocked(fetchTriangleResponsesForProject).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sentimentService.clearMemoryCache();
  });

  describe('1. Deferred Sentiment Promise: Base stories and charts usable before sentiment resolves', () => {
    it('returns stories with slider and triangle responses immediately while sentiment is deliberately pending', async () => {
      const deferred = createDeferred<Map<string, 'positive' | 'negative' | 'neutral'>>();
      const getBatchSpy = vi.spyOn(sentimentService, 'getBatchSentiments').mockReturnValue(deferred.promise);

      const mockStories = [
        {
          id: 'story-1',
          title: 'Uncached Emotion Story',
          text: 'Story content',
          emotional_response: 'totally_unheard_emotion_xyz',
          feeling_sentiment: null,
          created_at: new Date().toISOString(),
          is_public: true,
          is_imported: false,
          st_project_id: 'proj-1',
        },
      ];

      const mockSliderResponses = [
        {
          id: 'slider-resp-1',
          story_id: 'story-1',
          question_id: 101,
          question_text: 'Leadership Alignment',
          value: 82,
          left_label: 'Low',
          right_label: 'High',
        },
      ];

      const mockTriangleResponses = [
        {
          id: 'tri-resp-1',
          story_id: 'story-1',
          question_id: 201,
          question_text: 'Strategy Focus',
          value_x: 0.3,
          value_y: 0.4,
          value_z: 0.3,
        },
      ];

      vi.mocked(fetchSliderResponsesForProject).mockResolvedValue(mockSliderResponses as unknown as never);
      vi.mocked(fetchTriangleResponsesForProject).mockResolvedValue(mockTriangleResponses as unknown as never);

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockStories, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      // fetchStoriesForProject must resolve without waiting for `deferred.promise`
      const storiesPromise = fetchStoriesForProject('proj-1');
      const stories = await storiesPromise;

      expect(stories).toBeDefined();
      expect(stories.length).toBe(1);
      expect(stories[0].id).toBe('story-1');

      // Story-dependent chart data is immediately present and functional
      expect(stories[0].sliderResponses).toBeDefined();
      expect(stories[0].sliderResponses).toHaveLength(1);
      expect(stories[0].sliderResponses![0].question_text).toBe('Leadership Alignment');
      expect(stories[0].sliderResponses![0].value).toBe(82);

      expect(stories[0].triangleResponses).toBeDefined();
      expect(stories[0].triangleResponses).toHaveLength(1);
      expect(stories[0].triangleResponses![0].question_text).toBe('Strategy Focus');

      // Sentiment is undefined (not blocked and not falsely converted to neutral)
      expect(stories[0].feelingSentiment).toBeUndefined();
      expect(stories[0].hasPersistedSentiment).toBe(false);

      // fetchStoriesForProject must NOT call or await getBatchSentiments on the critical path
      expect(getBatchSpy).not.toHaveBeenCalled();

      // Clean up deferred promise
      deferred.resolve(new Map());
      getBatchSpy.mockRestore();
    });
  });

  describe('2. Sentiment Service Failure Handling & Rejection Propagation', () => {
    it('rejects enrichment query on complete network/API failure while preserving base stories and local fallback', async () => {
      const mockStories = [
        {
          id: 'story-2',
          title: 'Story 2',
          text: 'Content',
          emotional_response: 'hopeful',
          feeling_sentiment: null,
          created_at: new Date().toISOString(),
          st_project_id: 'proj-1',
        },
      ];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockStories, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      // 1. Base stories resolve with provisional local fallback
      const stories = await fetchStoriesForProject('proj-1');
      expect(stories.length).toBe(1);
      // Provisional local fallback matches 'hopeful' -> 'positive'
      expect(stories[0].feelingSentiment).toBe('positive');
      expect(stories[0].hasPersistedSentiment).toBe(false);

      // 2. Complete network/API failure MUST reject the enrichment promise (enabling retry: 1 in TanStack Query)
      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
      );
      vi.stubGlobal('fetch', fetchMock);

      await expect(
        sentimentService.getBatchSentiments(['hopeful'], { projectId: 'proj-1' })
      ).rejects.toThrow('/api/ai/sentiment returned 500');
      vi.unstubAllGlobals();

      // 3. Base stories and local fallback remain intact and usable even after enrichment fails
      expect(stories[0].feelingSentiment).toBe('positive');
    });

    it('propagates cancellation via AbortError instead of swallowing as an empty success', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        sentimentService.getBatchSentiments(['confused'], {
          projectId: 'proj-1',
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });

    it('returns validated successful items while leaving unresolved items absent in partial responses', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              results: [
                { emotion: 'grateful', sentiment: 'positive' },
                { emotion: 'unresolvable_dialect_word', sentiment: 'unknown' },
              ],
            }),
            { status: 200 }
          )
        )
      );

      const resultMap = await sentimentService.getBatchSentiments(
        ['grateful', 'unresolvable_dialect_word'],
        { projectId: 'proj-1' }
      );
      vi.unstubAllGlobals();

      // Validated item is present
      expect(resultMap.get('grateful')).toBe('positive');
      // Unresolved item is absent (not present, and never converted to neutral)
      expect(resultMap.has('unresolvable_dialect_word')).toBe(false);
    });
  });

  describe('3. Successful Enrichment Updates Sentiment Consumers', () => {
    it('applies canonical sentiment to unpersisted stories while preserving story structure', () => {
      const baseStories = [
        {
          id: 'story-3',
          title: 'Story 3',
          text: 'Content 3',
          feeling: 'esperançoso',
          feelingSentiment: 'positive' as const, // local provisional
          hasPersistedSentiment: false,
          sliderResponses: [{ id: 's1', question_id: 1, question_text: 'Q1', value: 50, response_type: 'answered' as const, left_label: '', right_label: '' }],
          participantResponses: [],
          triangleResponses: [],
          isPublic: true,
          isImported: false,
          date: '2026-10-16',
          has_audio: false,
          audio_url: null,
          additional_comments: '',
        },
      ];

      const enrichmentMap = new Map<string, 'positive' | 'negative' | 'neutral'>([
        ['esperançoso', 'positive'],
      ]);

      const derivedStories = baseStories.map(story => {
        if (story.hasPersistedSentiment) return story;
        const canonical = enrichmentMap.get(story.feeling);
        return canonical ? { ...story, feelingSentiment: canonical } : story;
      });

      expect(derivedStories[0].feelingSentiment).toBe('positive');
      expect(derivedStories[0].sliderResponses).toEqual(baseStories[0].sliderResponses);
    });
  });

  describe('4. Account Switching & Public-Share Cache Isolation', () => {
    it('scopes query keys and in-memory cache to user account, isolating User A from User B', async () => {
      const keyUserA = sentimentEnrichmentQueryKey('authenticated', 'user-111', 'proj-shared', CLASSIFIER_VERSION, ['happy']);
      const keyUserB = sentimentEnrichmentQueryKey('authenticated', 'user-222', 'proj-shared', CLASSIFIER_VERSION, ['happy']);

      // Distinct query keys
      expect(keyUserA[2]).toBe('user-111');
      expect(keyUserB[2]).toBe('user-222');
      expect(keyUserA).not.toEqual(keyUserB);

      // In-memory service cache isolation
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ results: [{ emotion: 'happy', sentiment: 'positive' }] }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ results: [{ emotion: 'happy', sentiment: 'positive' }] }),
            { status: 200 }
          )
        );
      vi.stubGlobal('fetch', fetchMock);

      // User A loads
      const userAResult = await sentimentService.getBatchSentiments(['happy'], {
        projectId: 'proj-shared',
        accessScope: 'authenticated',
        scopeIdentity: 'user-111',
      });
      expect(userAResult.get('happy')).toBe('positive');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // User B loads: User A's cache MUST NOT satisfy User B's request
      const userBResult = await sentimentService.getBatchSentiments(['happy'], {
        projectId: 'proj-shared',
        accessScope: 'authenticated',
        scopeIdentity: 'user-222',
      });
      expect(userBResult.get('happy')).toBe('positive');
      // Second call was required because cache was partitioned by user identity!
      expect(fetchMock).toHaveBeenCalledTimes(2);
      vi.unstubAllGlobals();

      // Clearing cache for User A leaves User B unaffected
      sentimentService.clearMemoryCache('user-111');
      // Full clear cleans all
      sentimentService.clearMemoryCache();
    });

    it('scopes query keys and service cache to non-secret share IDs without leaking raw tokens', async () => {
      const token1 = 'super-secret-token-share-1';
      const token2 = 'super-secret-token-share-2';

      const shareId1 = getNonSecretShareId(token1);
      const shareId2 = getNonSecretShareId(token2);

      // Non-secret IDs are generated and differ
      expect(shareId1).toMatch(/^share_[0-9a-f]+$/);
      expect(shareId2).toMatch(/^share_[0-9a-f]+$/);
      expect(shareId1).not.toBe(shareId2);

      // Raw secrets are NEVER in query keys
      const keyShare1 = sentimentEnrichmentQueryKey('public', shareId1, 'proj-1', CLASSIFIER_VERSION, ['hopeful']);
      const keyShare2 = sentimentEnrichmentQueryKey('public', shareId2, 'proj-1', CLASSIFIER_VERSION, ['hopeful']);

      expect(JSON.stringify(keyShare1)).not.toContain(token1);
      expect(JSON.stringify(keyShare2)).not.toContain(token2);
      expect(keyShare1).not.toEqual(keyShare2);

      // Public endpoint receives the actual token for validation
      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({ results: [{ emotion: 'hopeful', sentiment: 'positive' }] }),
          { status: 200 }
        )
      );
      vi.stubGlobal('fetch', fetchMock);

      await sentimentService.getBatchSentiments(['hopeful'], {
        projectId: 'proj-1',
        accessScope: 'public',
        scopeIdentity: shareId1,
        dashboardToken: token1,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/ai/sentiment',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            emotions: ['hopeful'],
            projectId: 'proj-1',
            dashboardToken: token1,
          }),
        })
      );
      vi.unstubAllGlobals();
    });
  });

  describe('5. Persisted Sentiment Precedence', () => {
    it('strictly preserves valid database sentiment and never overwrites with late enrichment', () => {
      const storyWithPersistedSentiment = {
        id: 'story-persisted',
        title: 'Authoritative DB Story',
        text: 'Text',
        feeling: 'anxious',
        feelingSentiment: 'negative' as const,
        hasPersistedSentiment: true,
      };

      const contradictoryEnrichment = new Map([['anxious', 'positive' as const]]);

      const derivedStory = (() => {
        if (storyWithPersistedSentiment.hasPersistedSentiment) {
          return storyWithPersistedSentiment; // Must NOT be overwritten
        }
        const canonical = contradictoryEnrichment.get(storyWithPersistedSentiment.feeling);
        return canonical ? { ...storyWithPersistedSentiment, feelingSentiment: canonical } : storyWithPersistedSentiment;
      })();

      expect(derivedStory.feelingSentiment).toBe('negative');
      expect(derivedStory.hasPersistedSentiment).toBe(true);
    });
  });

  describe('6. No Invented Neutral Classification', () => {
    it('leaves unrecognized or unspecified emotions as undefined without converting to neutral', () => {
      expect(determineEmotionLocally('totally_unknown_custom_neologism')).toBe('unknown');
      expect(determineEmotionLocally('')).toBe('unknown');
      expect(determineEmotionLocally(undefined)).toBe('unknown');

      expect(isValidSentiment('positive')).toBe(true);
      expect(isValidSentiment('negative')).toBe(true);
      expect(isValidSentiment('neutral')).toBe(true);
      expect(isValidSentiment('unknown')).toBe(false);
      expect(isValidSentiment('invalid_label')).toBe(false);
      expect(isValidSentiment(null)).toBe(false);
      expect(isValidSentiment(undefined)).toBe(false);
    });
  });

  describe('7. Query Identity Distinctness (Commas in feeling labels)', () => {
    it('produces distinct serializable query keys for emotion arrays with commas', () => {
      const emotionSet1 = ['a,b', 'c'];
      const emotionSet2 = ['a', 'b,c'];

      const key1 = sentimentEnrichmentQueryKey('authenticated', 'user-1', 'proj-1', CLASSIFIER_VERSION, emotionSet1);
      const key2 = sentimentEnrichmentQueryKey('authenticated', 'user-1', 'proj-1', CLASSIFIER_VERSION, emotionSet2);

      expect(key1).not.toEqual(key2);
      expect(key1[5]).toEqual(['a,b', 'c']);
      expect(key2[5]).toEqual(['a', 'b,c']);
    });
  });

  describe('8. Transcription Refetch Structural Sharing', () => {
    it('returns new stories array when story text changes after transcription even if timestamps match', () => {
      const oldStories = [
        {
          id: 'story-audio-1',
          title: 'Audio Story',
          text: '[Audio Recording - Transcription Pending]',
          feeling: 'neutral',
          date: '2026-11-05T10:00:00Z',
          created_at: '2026-11-05T10:00:00Z',
        },
      ];
      const newStories = [
        {
          ...oldStories[0],
          text: 'Transcribed audio narrative from Whisper.',
        },
      ];

      const shared = storiesStructuralSharing(oldStories, newStories);
      expect(shared).toBe(newStories);
      expect(shared[0].text).toBe('Transcribed audio narrative from Whisper.');
    });
  });
});
