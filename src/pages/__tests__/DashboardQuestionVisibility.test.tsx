import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider, UseQueryResult } from '@tanstack/react-query';
import Dashboard from '../Dashboard';
import { useProject } from '@/contexts/ProjectContext';
import { useStoriesQuery } from '@/hooks/queries/useStoriesQuery';
import { useFormDataQuery } from '@/hooks/queries/useFormDataQuery';
import { Story, TriangleResponse, SliderResponse } from '@/types/story';
import { Project } from '@/types/project';
import { FormDataState } from '@/types/formTypes';

// Polyfill ResizeObserver
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('@/contexts/ProjectContext', () => ({
  useProject: vi.fn(),
}));

vi.mock('@/hooks/queries/useStoriesQuery', () => ({
  useStoriesQuery: vi.fn(),
}));

vi.mock('@/hooks/queries/useFormDataQuery', () => ({
  useFormDataQuery: vi.fn(),
}));

// Mock subcomponents
vi.mock('@/components/dashboard/SliderInsightsSection', () => ({
  default: () => <div data-testid="slider-insights-section">Slider Insights Section</div>,
}));

vi.mock('@/components/dashboard/SliderComparisonChart', () => ({
  default: () => <div data-testid="slider-comparison-chart">Slider Comparison Chart</div>,
}));

vi.mock('@/components/dashboard/triangle/TriangleInsightsSection', () => ({
  default: () => <div data-testid="triangle-insights-section">Triangle Insights Section</div>,
}));

vi.mock('@/components/dashboard/ChartsSection', () => ({
  default: () => <div data-testid="charts-section">Charts Section</div>,
}));

vi.mock('@/components/dashboard/WordCloudSection', () => ({
  default: () => <div data-testid="word-cloud-section">Word Cloud Section</div>,
}));

vi.mock('@/components/dashboard/NetworkDiagramSection', () => ({
  default: () => <div data-testid="network-diagram-section">Network Diagram Section</div>,
}));

vi.mock('@/components/dashboard/PatternInsightsCard', () => ({
  default: () => <div data-testid="pattern-insights-card">Pattern Insights Card</div>,
}));

vi.mock('@/components/dashboard/StatsSection', () => ({
  default: () => <div data-testid="stats-section">Stats Section</div>,
}));

vi.mock('@/components/dashboard/ShareDashboardSection', () => ({
  default: () => <div data-testid="share-section">Share Section</div>,
}));

vi.mock('@/components/dashboard/comparisons/SavedComparisonsDrawer', () => ({
  SavedComparisonsDrawer: () => <div data-testid="saved-comparisons">Saved Comparisons</div>,
}));

vi.mock('@/hooks/comparisons/useComparisonRehydration', () => ({
  useComparisonRehydration: () => ({ rehydrated: null }),
}));

const createMockStory = (overrides: Partial<Story> = {}): Story => ({
  id: 'story-1',
  title: 'Story 1',
  text: 'Sample',
  feeling: 'positive',
  date: '2026-01-01',
  created_at: '2026-01-01T00:00:00Z',
  project_id: 'proj-triangle-1',
  triangleResponses: [],
  sliderResponses: [],
  ...overrides,
});

describe('Dashboard Question Section Visibility', () => {
  let queryClient: QueryClient;

  const mockActiveProject: Project = {
    id: 'proj-triangle-1',
    name: 'Triangle Research',
    description: null,
    is_active: true,
    is_template: false,
    is_event_mode: false,
    activated_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mocked(useProject).mockReturnValue({
      activeProject: mockActiveProject,
      setActiveProject: vi.fn(),
      currentUserProjectRole: 'owner',
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders triangle section directly and does NOT render slider cards for triangle project', async () => {
    const triangleResponse: TriangleResponse = {
      id: 'tr-1',
      question_id: 1,
      question_text: 'Tradeoffs',
      top_label: 'Top',
      bottom_left_label: 'Left',
      bottom_right_label: 'Right',
      x_position: 50,
      y_position: 50,
      response_type: 'answered',
    };

    const mockStories = [createMockStory({ triangleResponses: [triangleResponse] })];

    vi.mocked(useStoriesQuery).mockReturnValue({
      data: mockStories,
      isLoading: false,
      refetch: vi.fn(),
      error: null,
    } as unknown as ReturnType<typeof useStoriesQuery>);

    const mockFormData: FormDataState = {
      storyQuestion: '',
      sliderQuestions: [],
      participantQuestions: [],
      triangleQuestions: [{ id: 1, theme: 'General', question: 'Tradeoffs', topLabel: 'Top', bottomLeftLabel: 'Left', bottomRightLabel: 'Right' }],
      questionType: 'triangle',
      formDesigned: true,
      isLoading: false,
    };

    vi.mocked(useFormDataQuery).mockReturnValue({
      data: mockFormData,
      isLoading: false,
    } as unknown as UseQueryResult<FormDataState>);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('triangle-insights-section')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('slider-insights-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('slider-comparison-chart')).not.toBeInTheDocument();
  });

  it('renders triangle section immediately while formData is still loading if stories has triangle responses', async () => {
    const triangleResponse: TriangleResponse = {
      id: 'tr-1',
      question_id: 1,
      question_text: 'Tradeoffs',
      top_label: 'Top',
      bottom_left_label: 'Left',
      bottom_right_label: 'Right',
      x_position: 50,
      y_position: 50,
      response_type: 'answered',
    };

    const mockStories = [createMockStory({ triangleResponses: [triangleResponse] })];

    vi.mocked(useStoriesQuery).mockReturnValue({
      data: mockStories,
      isLoading: false,
      refetch: vi.fn(),
      error: null,
    } as unknown as ReturnType<typeof useStoriesQuery>);

    vi.mocked(useFormDataQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as UseQueryResult<FormDataState>);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('triangle-insights-section')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('slider-insights-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('slider-comparison-chart')).not.toBeInTheDocument();
  });

  it('does NOT render slider cards while formData is loading when stories have no responses yet', async () => {
    const mockStories = [createMockStory()];

    vi.mocked(useStoriesQuery).mockReturnValue({
      data: mockStories,
      isLoading: false,
      refetch: vi.fn(),
      error: null,
    } as unknown as ReturnType<typeof useStoriesQuery>);

    vi.mocked(useFormDataQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as UseQueryResult<FormDataState>);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.queryByTestId('slider-insights-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('slider-comparison-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('triangle-insights-section')).not.toBeInTheDocument();
  });

  it('renders both slider and triangle sections for mixed projects', async () => {
    const triangleResponse: TriangleResponse = {
      id: 'tr-1',
      question_id: 1,
      question_text: 'Tradeoffs',
      top_label: 'Top',
      bottom_left_label: 'Left',
      bottom_right_label: 'Right',
      x_position: 50,
      y_position: 50,
      response_type: 'answered',
    };

    const sliderResponse: SliderResponse = {
      id: 'sr-1',
      question_id: 101,
      question_text: 'Velocity',
      value: 80,
      response_type: 'answered',
    };

    const mockStories = [
      createMockStory({
        triangleResponses: [triangleResponse],
        sliderResponses: [sliderResponse],
      }),
    ];

    vi.mocked(useStoriesQuery).mockReturnValue({
      data: mockStories,
      isLoading: false,
      refetch: vi.fn(),
      error: null,
    } as unknown as ReturnType<typeof useStoriesQuery>);

    const mockFormData: FormDataState = {
      storyQuestion: '',
      sliderQuestions: [{ id: 101, theme: 'General', question: 'Velocity', leftLabel: 'Slow', rightLabel: 'Fast' }],
      participantQuestions: [],
      triangleQuestions: [{ id: 1, theme: 'General', question: 'Tradeoffs', topLabel: 'Top', bottomLeftLabel: 'Left', bottomRightLabel: 'Right' }],
      questionType: 'both',
      formDesigned: true,
      isLoading: false,
    };

    vi.mocked(useFormDataQuery).mockReturnValue({
      data: mockFormData,
      isLoading: false,
    } as unknown as UseQueryResult<FormDataState>);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('triangle-insights-section')).toBeInTheDocument();
      expect(screen.getByTestId('slider-insights-section')).toBeInTheDocument();
      expect(screen.getByTestId('slider-comparison-chart')).toBeInTheDocument();
    });
  });

  it('renders configured triangle section with empty state when zero responses exist yet', async () => {
    const mockStories = [createMockStory()];

    vi.mocked(useStoriesQuery).mockReturnValue({
      data: mockStories,
      isLoading: false,
      refetch: vi.fn(),
      error: null,
    } as unknown as ReturnType<typeof useStoriesQuery>);

    const mockFormData: FormDataState = {
      storyQuestion: '',
      sliderQuestions: [],
      participantQuestions: [],
      triangleQuestions: [{ id: 1, theme: 'General', question: 'Tradeoffs', topLabel: 'Top', bottomLeftLabel: 'Left', bottomRightLabel: 'Right' }],
      questionType: 'triangle',
      formDesigned: true,
      isLoading: false,
    };

    vi.mocked(useFormDataQuery).mockReturnValue({
      data: mockFormData,
      isLoading: false,
    } as unknown as UseQueryResult<FormDataState>);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('triangle-insights-section')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('slider-insights-section')).not.toBeInTheDocument();
  });

  it('ignores stale stories from prior project during project switch', async () => {
    const sliderResponse: SliderResponse = {
      id: 'sr-old',
      question_id: 99,
      question_text: 'Old Slider',
      value: 50,
      response_type: 'answered',
    };

    const mockStories = [
      createMockStory({
        id: 'story-old-1',
        project_id: 'proj-old-slider',
        triangleResponses: [],
        sliderResponses: [sliderResponse],
      }),
    ];

    vi.mocked(useStoriesQuery).mockReturnValue({
      data: mockStories,
      isLoading: false,
      refetch: vi.fn(),
      error: null,
    } as unknown as ReturnType<typeof useStoriesQuery>);

    vi.mocked(useFormDataQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as UseQueryResult<FormDataState>);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.queryByTestId('slider-insights-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('slider-comparison-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('triangle-insights-section')).not.toBeInTheDocument();
  });

  it('triggers both refetch and formData query invalidation when clicking the refresh indicator', async () => {
    const mockRefetch = vi.fn().mockResolvedValue({});
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    vi.mocked(useStoriesQuery).mockReturnValue({
      data: [createMockStory()],
      isLoading: false,
      refetch: mockRefetch,
      error: null,
    } as unknown as ReturnType<typeof useStoriesQuery>);

    vi.mocked(useFormDataQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as UseQueryResult<FormDataState>);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const refreshButton = screen.getByRole('button', { name: /refresh dashboard data/i });
    expect(refreshButton).toBeInTheDocument();

    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['formData', mockActiveProject.id],
      });
    });
  });

  it('ignores stale cached stories from another project while switching projects', () => {
    vi.mocked(useStoriesQuery).mockReturnValue({
      data: [createMockStory({ project_id: 'other-project' })],
      isLoading: false,
      refetch: vi.fn(),
      error: null,
    } as unknown as ReturnType<typeof useStoriesQuery>);

    vi.mocked(useFormDataQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as UseQueryResult<FormDataState>);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('No Stories Collected Yet')).toBeInTheDocument();
    expect(screen.queryByTestId('stats-section')).not.toBeInTheDocument();
  });
});
