import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ShareDashboardSection from '../ShareDashboardSection';
import { useProject } from '@/contexts/ProjectContext';
import { useDashboardTokensQuery } from '@/hooks/queries/useDashboardTokensQuery';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/contexts/ProjectContext', () => ({
  useProject: vi.fn(),
}));

vi.mock('@/hooks/queries/useDashboardTokensQuery', () => ({
  useDashboardTokensQuery: vi.fn(),
  dashboardTokensQueryKey: vi.fn((id: string) => ['dashboard_tokens', id]),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('@/components/common/EmbedCodeDialog', () => ({
  default: () => <button aria-label="Get embed code">Get embed code</button>,
}));

const mockToken = {
  id: 'token-123',
  project_id: 'test-proj',
  token: 'public-tok-xyz',
  is_active: true,
  created_at: new Date().toISOString(),
};

describe('ShareDashboardSection permissions', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mocked(useDashboardTokensQuery).mockReturnValue({
      data: [mockToken],
      isLoading: false,
    } as unknown as ReturnType<typeof useDashboardTokensQuery>);
  });

  const setupSupabaseMock = (projectOwnerId: string, currentUserId: string) => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: currentUserId } as unknown as { id: string } },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { user_id: projectOwnerId, is_template: false },
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);
  };

  it('Owner: sees "Create Public Link" and Revoke link trash button', async () => {
    setupSupabaseMock('owner-id', 'owner-id');
    vi.mocked(useProject).mockReturnValue({
      currentUserProjectRole: 'owner',
    } as unknown as ReturnType<typeof useProject>);

    render(
      <QueryClientProvider client={queryClient}>
        <ShareDashboardSection projectId="test-proj" projectName="Test Project" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create public link/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /revoke link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });

  it('Editor: does NOT see "Create Public Link", does NOT see Revoke button, but sees Share actions', async () => {
    setupSupabaseMock('owner-id', 'editor-id');
    vi.mocked(useProject).mockReturnValue({
      currentUserProjectRole: 'editor',
    } as unknown as ReturnType<typeof useProject>);

    render(
      <QueryClientProvider client={queryClient}>
        <ShareDashboardSection projectId="test-proj" projectName="Test Project" />
      </QueryClientProvider>
    );

    // Wait for permission resolution
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /create public link/i })).not.toBeInTheDocument();
    });

    // Revoke button must not be rendered
    expect(screen.queryByRole('button', { name: /revoke link/i })).not.toBeInTheDocument();

    // Warning banner must not be rendered
    expect(screen.queryByText(/only project owners can create public dashboard links/i)).not.toBeInTheDocument();

    // Sharing actions are accessible
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get embed code/i })).toBeInTheDocument();
  });

  it('Viewer: does NOT see "Create Public Link", does NOT see Revoke button, but sees Share actions', async () => {
    setupSupabaseMock('owner-id', 'viewer-id');
    vi.mocked(useProject).mockReturnValue({
      currentUserProjectRole: 'viewer',
    } as unknown as ReturnType<typeof useProject>);

    render(
      <QueryClientProvider client={queryClient}>
        <ShareDashboardSection projectId="test-proj" projectName="Test Project" />
      </QueryClientProvider>
    );

    // Wait for permission resolution
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /create public link/i })).not.toBeInTheDocument();
    });

    // Revoke button must not be rendered
    expect(screen.queryByRole('button', { name: /revoke link/i })).not.toBeInTheDocument();

    // Warning banner must not be rendered
    expect(screen.queryByText(/only project owners can create public dashboard links/i)).not.toBeInTheDocument();

    // Sharing actions are accessible
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get embed code/i })).toBeInTheDocument();
  });
});
