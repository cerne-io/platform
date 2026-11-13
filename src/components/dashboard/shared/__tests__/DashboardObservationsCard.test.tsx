import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardObservationsCard from '../DashboardObservationsCard';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('DashboardObservationsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads public observations from React Query cache without querying Supabase', async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(['publicObservations', 'proj-1'], [
      { question_id: 'slider-1-2', observations: ['Cached Obs'], hypotheses: ['Cached Hyp'] },
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardObservationsCard projectId="proj-1" questionKey="slider-1-2" isPublic />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Cached Obs')).toBeInTheDocument();
    expect(screen.getByText('Cached Hyp')).toBeInTheDocument();
    expect(screen.getByText(/\(Read Only\)/)).toBeInTheDocument();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('ignores stale fetch results when questionKey changes before the first load completes', async () => {
    const firstReq = deferred<{ data: { observations: string[]; hypotheses: string[] } | null; error: null }>();
    const secondReq = deferred<{ data: { observations: string[]; hypotheses: string[] } | null; error: null }>();

    const maybeSingleMock = vi.fn()
      .mockReturnValueOnce(firstReq.promise)
      .mockReturnValueOnce(secondReq.promise);

    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: maybeSingleMock,
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }) as never);

    const queryClient = createQueryClient();
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <DashboardObservationsCard projectId="proj-1" questionKey="slider-1-2" />
      </QueryClientProvider>
    );

    rerender(
      <QueryClientProvider client={queryClient}>
        <DashboardObservationsCard projectId="proj-1" questionKey="slider-1-3" />
      </QueryClientProvider>
    );

    secondReq.resolve({ data: { observations: ['New Question Note'], hypotheses: [] }, error: null });
    expect(await screen.findByText('New Question Note')).toBeInTheDocument();

    firstReq.resolve({ data: { observations: ['Stale Question Note'], hypotheses: [] }, error: null });
    await waitFor(() => {
      expect(screen.getByText('New Question Note')).toBeInTheDocument();
    });
    expect(screen.queryByText('Stale Question Note')).not.toBeInTheDocument();
  });

  it('flushes pending debounced edits to the original questionKey when switching questions within 1s', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: upsertMock,
    }) as never);

    const queryClient = createQueryClient();
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <DashboardObservationsCard projectId="proj-1" questionKey="slider-1-2" />
      </QueryClientProvider>
    );

    const input = await screen.findByPlaceholderText('Add an observation...');
    fireEvent.change(input, { target: { value: 'Urgent note for 1-2' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('Urgent note for 1-2')).toBeInTheDocument();

    rerender(
      <QueryClientProvider client={queryClient}>
        <DashboardObservationsCard projectId="proj-1" questionKey="slider-1-3" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 'proj-1',
          question_id: 'slider-1-2',
          observations: ['Urgent note for 1-2'],
        }),
        { onConflict: 'project_id,question_id' }
      );
    });
  });
});

