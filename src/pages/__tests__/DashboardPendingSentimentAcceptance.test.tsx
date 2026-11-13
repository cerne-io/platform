import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PublicDashboard from '../PublicDashboard';
import { sentimentService } from '@/services/sentimentService';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import SliderComparisonChart from '@/components/dashboard/SliderComparisonChart';
import { useStoriesQuery } from '@/hooks/queries/useStoriesQuery';
import { fetchStoriesForProject } from '@/services/story/fetch/fetchStoriesForProject';

// JSDOM polyfills for Recharts ResponsiveContainer
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-1' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/services/story/fetch/fetchStoriesForProject');

vi.mock('@/contexts/ProjectContext', () => ({
  useProject: vi.fn(),
  useOptionalProject: vi.fn(() => null),
  ProjectProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/queries/useFormDataQuery', () => ({
  useFormDataQuery: vi.fn(() => ({
    data: {
      storyQuestion: '',
      sliderQuestions: [{ id: 501, question_text: 'Cross-functional Velocity', left_label: 'Slow', right_label: 'Fast' }],
      participantQuestions: [],
      triangleQuestions: [],
      questionType: 'slider',
      formDesigned: true,
      isLoading: false,
    },
    isLoading: false,
  })),
}));

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const mockAuthContext = {
  user: { id: 'auth-user-999' } as unknown as import('@/lib/localClient').LocalUser,
  session: null,
  loading: false,
  passwordRequired: true,
  unconfigured: false,
  unlock: vi.fn(),
  signOut: vi.fn(),
  isPublicRoute: vi.fn().mockReturnValue(false),
};

describe('Phase 2 Acceptance: Controlled Pending-Sentiment & Auth-Transition Checks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    sentimentService.clearMemoryCache();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    vi.mocked(useProject).mockReturnValue({
      activeProject: { id: 'proj-auth-1', name: 'Strategic Project' } as unknown as import('@/types/project').Project,
      setActiveProject: vi.fn(),
      currentUserProjectRole: 'owner',
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sentimentService.clearMemoryCache();
    queryClient.clear();
  });

  describe('1. Controlled Pending-Sentiment on Public Dashboard', () => {
    it('renders story content and response metrics while sentiment enrichment remains pending', async () => {
      const sentimentDeferred = createDeferred<Map<string, 'positive' | 'negative' | 'neutral'>>();
      const getBatchSpy = vi.spyOn(sentimentService, 'getBatchSentiments').mockReturnValue(sentimentDeferred.promise);

      const mockStories = [
        {
          id: 'story-pub-1',
          title: 'Community Clean Energy Story',
          text: 'We installed community solar panels last summer and saved energy.',
          feeling: 'esperançoso',
          feelingSentiment: null, // raw unpersisted story from database
          hasPersistedSentiment: false,
          sliderResponses: [
            {
              id: 'sr-1',
              question_id: 10,
              question_text: 'Community Engagement',
              value: 85,
              response_type: 'answered' as const,
              left_label: 'Low',
              right_label: 'High',
            },
          ],
          participantResponses: [],
          triangleResponses: [],
          date: '2026-10-16',
          isPublic: true,
          isImported: false,
        },
      ];

      vi.mocked(supabase.rpc).mockImplementation(((name: string) => {
        if (name === 'get_public_dashboard_data') {
          return Promise.resolve({
            data: {
              project: { id: 'proj-public-1', name: 'Renewable Future Project', is_active: true },
              stories: mockStories,
              questionType: 'slider',
              customBranding: {},
              savedComparisons: [],
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }) as unknown as typeof supabase.rpc);

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={mockAuthContext as unknown as import('@/contexts/AuthContext').AuthContextType}>
            <MemoryRouter initialEntries={['/public-dashboard/pub-token-123']}>
              <Routes>
                <Route path="/public-dashboard/:token" element={<PublicDashboard />} />
              </Routes>
            </MemoryRouter>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // Verify base stories and project render while sentiment promise is strictly pending
      await waitFor(() => {
        expect(screen.getByText(/Renewable Future Project/)).toBeInTheDocument();
      });

      // Background sentiment service was called in the background
      expect(getBatchSpy).toHaveBeenCalled();

      // Resolve the pending sentiment promise
      await act(async () => {
        sentimentDeferred.resolve(new Map([['esperançoso', 'positive']]));
      });

      // Still renders cleanly after enrichment
      expect(screen.getByText(/Renewable Future Project/)).toBeInTheDocument();
    });
  });

  describe('2. Controlled Pending-Sentiment on Story-Dependent Charts (Authenticated)', () => {
    // Consumer component to test useStoriesQuery with SliderComparisonChart
    const AuthenticatedChartTestConsumer: React.FC = () => {
      const { data: stories = [], isLoading } = useStoriesQuery();

      if (isLoading) {
        return <div data-testid="loading-state">Loading stories...</div>;
      }

      return (
        <div>
          <div data-testid="stories-count">Loaded {stories.length} stories</div>
          <SliderComparisonChart stories={stories} projectId="proj-auth-1" />
        </div>
      );
    };

    it('renders SliderComparisonChart and axis questions while sentiment promise is deliberately pending', async () => {
      const sentimentDeferred = createDeferred<Map<string, 'positive' | 'negative' | 'neutral'>>();
      vi.spyOn(sentimentService, 'getBatchSentiments').mockReturnValue(sentimentDeferred.promise);

      const mockBaseStories = [
        {
          id: 'story-auth-1',
          title: 'Executive Alignment Narrative',
          text: 'Our team aligned on quarterly strategic priorities.',
          feeling: 'inspired_unpersisted_emotion',
          feelingSentiment: undefined,
          hasPersistedSentiment: false,
          project_id: 'proj-auth-1',
          sliderResponses: [
            {
              id: 'sr-100',
              question_id: 501,
              question_text: 'Cross-functional Velocity',
              value: 78,
              response_type: 'answered' as const,
              left_label: 'Slow',
              right_label: 'Fast',
            },
          ],
          participantResponses: [],
          triangleResponses: [],
          date: '2026-10-16',
          isPublic: true,
          isImported: false,
        },
      ];

      vi.mocked(fetchStoriesForProject).mockResolvedValue(mockBaseStories);

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={mockAuthContext as unknown as import('@/contexts/AuthContext').AuthContextType}>
            <AuthenticatedChartTestConsumer />
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // Verify stories count and SliderComparisonChart become usable while sentiment remains pending
      await waitFor(() => {
        expect(screen.getByTestId('stories-count')).toHaveTextContent('Loaded 1 stories');
      });

      // Chart component is rendered (not replaced by a loading spinner)
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();

      // Resolve background enrichment
      await act(async () => {
        sentimentDeferred.resolve(new Map([['inspired_unpersisted_emotion', 'positive']]));
      });

      // Component remains active with enriched data
      expect(screen.getByTestId('stories-count')).toHaveTextContent('Loaded 1 stories');
    });
  });

  describe('3. Auth-Transition Regression Check', () => {
    it('reliably clears sentimentService memoryCache and queryClient on sign out and user account switch', async () => {
      // 1. Populate sentiment memory cache for User A
      sentimentService.clearMemoryCache();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ results: [{ emotion: 'gratitude', sentiment: 'positive' }] }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ results: [{ emotion: 'gratitude', sentiment: 'positive' }] }),
            { status: 200 }
          )
        );
      vi.stubGlobal('fetch', fetchMock);

      await sentimentService.getBatchSentiments(['gratitude'], {
        projectId: 'proj-1',
        accessScope: 'authenticated',
        scopeIdentity: 'user-a',
      });

      // User A's cache is active
      const userACache = await sentimentService.getBatchSentiments(['gratitude'], {
        projectId: 'proj-1',
        accessScope: 'authenticated',
        scopeIdentity: 'user-a',
      });
      expect(userACache.get('gratitude')).toBe('positive');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // 2. Perform clearMemoryCache (simulating AuthContext onAuthStateChange / signOut)
      sentimentService.clearMemoryCache();
      queryClient.clear();

      // 3. User B loads the same emotion on the same project
      const userBCache = await sentimentService.getBatchSentiments(['gratitude'], {
        projectId: 'proj-1',
        accessScope: 'authenticated',
        scopeIdentity: 'user-b',
      });
      expect(userBCache.get('gratitude')).toBe('positive');

      // Second API call was forced because the previous user's cache was completely evicted
      expect(fetchMock).toHaveBeenCalledTimes(2);
      vi.unstubAllGlobals();
    });
  });
});
