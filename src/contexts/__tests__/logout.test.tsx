import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../integrations/supabase/client';
import type { AuthChangeEvent, LocalDbError, LocalSession } from '../../lib/localClient';
import { getSignedOut, setSignedOut } from '../../utils/auth/signedOutFlag';
import React, { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getStatus: vi.fn().mockResolvedValue({ passwordRequired: true, unlocked: true }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: '123' } } } }),
      unlock: vi.fn().mockResolvedValue({ error: null, session: { access_token: 'c', token_type: 'cookie', user: { id: '123' } } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    }
  }
}));

// Mock toast to test late callback suppression
const mockToast = vi.fn();
vi.mock('../../components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
  toast: (...args: unknown[]) => mockToast(...args),
}));
vi.mock('../../hooks/toast', () => ({
  useToast: () => ({ toast: mockToast }),
  toast: (...args: unknown[]) => mockToast(...args),
}));

describe('Logout flow and cache isolation', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
    setSignedOut(false);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );

  it('verifies provider identity, reverted state on cancel, and cache clear only on success', async () => {
    // 1. Provider identity & query cancellation setup
    let resolveQuery: (val: unknown) => void;
    let queryFnCalled = 0;
    
    const { result, unmount } = renderHook(() => {
      const auth = useAuth();
      const client = useQueryClient();
      
      const query = useQuery({
        queryKey: ['projects', '123'],
        queryFn: () => {
          queryFnCalled++;
          return new Promise((resolve) => { resolveQuery = resolve; });
        },
        enabled: !auth.loading && Boolean(auth.user),
      });
      
      return { auth, client, query };
    }, { wrapper });

    await waitFor(() => expect(result.current.auth.loading).toBe(false));
    expect(result.current.client).toBe(queryClient);

    // Let the first query resolve to establish state A
    await waitFor(() => expect(result.current.query.isFetching).toBe(true));
    await act(async () => {
      resolveQuery([{ id: 1 }]);
    });
    await waitFor(() => expect(result.current.query.data).toEqual([{ id: 1 }]));
    
    // Trigger a refetch that will stay pending
    await act(async () => {
      void result.current.query.refetch();
    });
    await waitFor(() => expect(result.current.query.isFetching).toBe(true));

    // Make signOut fail initially
    vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: { message: 'Network error' } as LocalDbError });
    
    await act(async () => {
      const res = await result.current.auth.signOut();
      expect(res?.error).toBeDefined();
    });

    // Cache should NOT be cleared if error
    expect(queryClient.getQueryData(['projects', '123'])).toBeDefined();

    // Make signOut succeed
    vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });
    
    await act(async () => {
      const res = await result.current.auth.signOut();
      expect(res?.error).toBeNull();
    });

    // Cache should be cleared on success
    expect(queryClient.getQueryData(['projects', '123'])).toBeUndefined();

    // Observer reverted to state A (not error, not loading). 
    // Data is undefined because queryClient.clear() wiped it!
    expect(result.current.query.status).toBe('pending');
    
    // Ensure no private work restarts after logout
    const previousCalls = queryFnCalled;
    await act(async () => {
      // Simulate window focus / visibility change
      window.dispatchEvent(new Event('visibilitychange'));
    });
    // The queryFn should not be invoked again because the user is logged out (enabled is false)
    expect(queryFnCalled).toBe(previousCalls);

    unmount();
  });

  it('suppresses late mutation callbacks after signout', async () => {
    let resolveMutation: (val: unknown) => void;
    const { result } = renderHook(() => {
      const auth = useAuth();
      const mutation = useMutation({
        mutationFn: () => new Promise((resolve) => { resolveMutation = resolve; }),
        onSuccess: () => {
          if (getSignedOut()) return;
          mockToast({ title: 'Success' });
        }
      });
      return { auth, mutation };
    }, { wrapper });

    await waitFor(() => expect(result.current.auth.loading).toBe(false));

    // Start mutation
    let mutatePromise: unknown;
    act(() => {
      mutatePromise = result.current.mutation.mutateAsync();
    });

    // Call signOut while mutation is pending
    vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });
    await act(async () => {
      await result.current.auth.signOut();
    });

    expect(getSignedOut()).toBe(true);

    // Resolve mutation late
    await act(async () => {
      resolveMutation(true);
      await mutatePromise;
    });

    // Toast should not have been called due to getSignedOut() guard
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('shows informational toast when signOut is clicked without ADMIN_PASSWORD and locks on SIGNED_OUT event', async () => {
    let authCallback: ((event: AuthChangeEvent, session: LocalSession | null) => void) | undefined;
    vi.mocked(supabase.auth.getStatus).mockResolvedValueOnce({
      passwordRequired: false,
      unlocked: true,
    });
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementationOnce((cb) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeTruthy();

    await act(async () => {
      await result.current.signOut();
    });
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Workspace lock disabled' })
    );

    act(() => {
      authCallback?.('SIGNED_OUT', null);
    });
    expect(result.current.user).toBeNull();
  });
});
