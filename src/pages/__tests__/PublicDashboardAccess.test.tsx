import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PublicDashboard from '../PublicDashboard';
import { supabase } from '@/integrations/supabase/client';
import { formDataQueryKey } from '@/hooks/queries/useFormDataQuery';

// Mock subcomponents
vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="page-layout">{children}</div>,
}));

vi.mock('@/components/dashboard/StatsSection', () => ({
  default: () => <div data-testid="stats-section">Stats</div>,
}));

vi.mock('@/components/dashboard/SliderInsightsSection', () => ({
  default: () => <div data-testid="slider-insights-section">Slider Insights</div>,
}));

vi.mock('@/components/dashboard/ChartsSection', () => ({
  default: () => <div data-testid="charts-section">Charts</div>,
}));

vi.mock('@/components/dashboard/SliderComparisonChart', () => ({
  default: () => <div data-testid="slider-comparison-chart">Slider Comparison</div>,
}));

vi.mock('@/components/dashboard/WordCloudSection', () => ({
  default: () => <div data-testid="word-cloud-section">Word Cloud</div>,
}));

vi.mock('@/components/dashboard/triangle/TriangleInsightsSection', () => ({
  default: () => <div data-testid="triangle-insights-section">Triangle Insights</div>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

const mockStory = {
  id: 'story-1',
  text: 'A great experience',
  title: 'My Story',
  created_at: new Date().toISOString(),
  feeling: 'positive',
  slider_responses: [],
  triangle_responses: [],
  participant_responses: [],
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithProviders(ui: React.ReactElement, queryClient = createTestQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard/share/test-token']}>
        <Routes>
          <Route path="/dashboard/share/:token" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PublicDashboard feature access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT render advanced features when project.is_active is false', async () => {
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        project: {
          id: 'proj-inactive',
          title: 'Inactive Project',
          is_active: false,
        },
        stories: [mockStory],
        questionType: 'slider',
      },
      error: null,
    });

    renderWithProviders(<PublicDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-section')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('network-diagram-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pattern-insights-card')).not.toBeInTheDocument();
  });

  it('renders advanced features when project.is_active is true', async () => {
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        project: {
          id: 'proj-active',
          title: 'Active Project',
          is_active: true,
        },
        stories: [mockStory],
        questionType: 'slider',
      },
      error: null,
    });

    renderWithProviders(<PublicDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-section')).toBeInTheDocument();
    });

    expect(await screen.findByTestId('slider-insights-section')).toBeInTheDocument();
    expect(await screen.findByTestId('slider-comparison-chart')).toBeInTheDocument();
  });

  it('seeds formConfig and observations into React Query cache without calling admin table queries', async () => {
    const queryClient = createTestQueryClient();
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        project: {
          id: 'proj-seeded',
          name: 'Seeded Public Project',
          is_active: true,
        },
        stories: [mockStory],
        questionType: 'slider',
        formConfig: [
          {
            id: 'ar-1',
            ar_project_id: 'proj-seeded',
            ar_phase_id: 'collection',
            ar_step_id: 'public-form',
            ar_activity_id: 'participant-questions',
            ar_response: {
              includePreferNotToSay: false,
              participantQuestions: [
                { id: 'role', label: 'Team Role', choices: [{ id: 'eng', label: 'Engineering' }] },
              ],
            },
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        observations: [
          { question_id: 'slider-1-2', observations: ['Obs 1'], hypotheses: ['Hyp 1'] },
        ],
      },
      error: null,
    });

    renderWithProviders(<PublicDashboard />, queryClient);

    await waitFor(() => {
      expect(screen.getByTestId('stats-section')).toBeInTheDocument();
    });

    const cachedForm = queryClient.getQueryData<{ participantQuestions: Array<{ label: string }> }>(
      formDataQueryKey('proj-seeded', true)
    );
    expect(cachedForm?.participantQuestions[0]?.label).toBe('Team Role');
    expect(queryClient.getQueryData(['publicObservations', 'proj-seeded'])).toEqual([
      { question_id: 'slider-1-2', observations: ['Obs 1'], hypotheses: ['Hyp 1'] },
    ]);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
