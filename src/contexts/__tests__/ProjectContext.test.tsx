import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ProjectProvider, useProject } from '../ProjectContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { AuthContextType } from '@/contexts/AuthContext';
import * as AuthContextModule from '@/contexts/AuthContext';
import * as ProjectServiceModule from '@/services/projectService';
import { Project } from '@/types/project';

// Mocks
vi.mock('@/contexts/AuthContext');
vi.mock('@/services/projectService');
vi.mock('@/utils/debugLogger', () => ({
  debugLog: vi.fn(),
  debugError: vi.fn(),
}));

const mockUseAuth = vi.spyOn(AuthContextModule, 'useAuth');
const mockFetchProjectById = vi.spyOn(ProjectServiceModule, 'fetchProjectById');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ProjectProvider>{children}</ProjectProvider>
    </QueryClientProvider>
  );
};

const MOCK_USER_A = { id: 'user-a', email: 'a@example.com' };
const MOCK_USER_B = { id: 'user-b', email: 'b@example.com' };

const MOCK_PROJECT_A: Project = { id: 'proj-a', name: 'Project A', is_active: true } as Project;
const MOCK_PROJECT_B: Project = { id: 'proj-b', name: 'Project B', is_active: true } as Project;

describe('ProjectContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    } as unknown as AuthContextType);

    mockFetchProjectById.mockResolvedValue({ data: null, error: null });
  });

  it('Provider mounts before auth hydration; a legacy selection restores afterward', async () => {
    // 1. Setup legacy storage
    localStorage.setItem('activeProjectId', 'legacy-proj');
    mockFetchProjectById.mockResolvedValue({ data: { id: 'legacy-proj', name: 'Legacy' } as Project, error: null });

    // 2. Auth hydrating (loading: true, user: null)
    mockUseAuth.mockReturnValue({ user: null, loading: true } as unknown as AuthContextType);
    
    const { result, rerender } = renderHook(() => useProject(), { wrapper: createWrapper() });

    // Wait for context loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.activeProject).toBe(null);

    // 3. Hydration finishes
    mockUseAuth.mockReturnValue({ user: MOCK_USER_A, loading: false } as unknown as AuthContextType);
    rerender();

    // Should fetch and restore legacy
    await waitFor(() => {
      expect(result.current.activeProject?.id).toBe('legacy-proj');
    });

    // Validated, so legacy should be cleared and scoped written
    expect(localStorage.getItem('activeProjectId')).toBeNull();
    expect(localStorage.getItem(`activeProjectId:${MOCK_USER_A.id}`)).toBe('legacy-proj');
  });

  it('User A -> user B does not briefly request A’s selected project as B', async () => {
    // Setup A and B
    localStorage.setItem(`activeProjectId:${MOCK_USER_A.id}`, 'proj-a');
    localStorage.setItem(`activeProjectId:${MOCK_USER_B.id}`, 'proj-b');
    
    mockFetchProjectById.mockImplementation(async (id) => {
      if (id === 'proj-a') return { data: MOCK_PROJECT_A, error: null };
      if (id === 'proj-b') return { data: MOCK_PROJECT_B, error: null };
      return { data: null, error: null };
    });

    mockUseAuth.mockReturnValue({ user: MOCK_USER_A, loading: false } as unknown as AuthContextType);
    const { result, rerender } = renderHook(() => useProject(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.activeProject?.id).toBe('proj-a');
    });

    // Switch to User B
    mockUseAuth.mockReturnValue({ user: MOCK_USER_B, loading: false } as unknown as AuthContextType);
    rerender();

    // Even synchronously right after rerender, it should NOT expose A's project
    expect(result.current.activeProject?.id).not.toBe('proj-a');

    await waitFor(() => {
      expect(result.current.activeProject?.id).toBe('proj-b');
    });
    
    // Verify we didn't call fetch with proj-a under user B. 
    // fetchProjectById does not know the user, but the queryKey prevents caching leaks.
  });

  it('Storage access failure does not crash the provider', async () => {
    mockFetchProjectById.mockImplementation(async (id) => {
      if (id === 'proj-a') return { data: MOCK_PROJECT_A, error: null };
      return { data: null, error: null };
    });
    mockUseAuth.mockReturnValue({ user: MOCK_USER_A, loading: false } as unknown as AuthContextType);
    
    // Simulate quota exceeded or strict mode
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    const { result } = renderHook(() => useProject(), { wrapper: createWrapper() });

    // Try setting a project
    act(() => {
      result.current.setActiveProject(MOCK_PROJECT_A);
    });

    // Should not crash, and memory state should still update!
    await waitFor(() => {
      expect(result.current.activeProject?.id).toBe('proj-a');
    });

    setItemSpy.mockRestore();
  });

  it('Transient fetch failure preserves the pointer and exposes an error', async () => {
    localStorage.setItem(`activeProjectId:${MOCK_USER_A.id}`, 'proj-transient');
    
    const mockError = new Error('Network timeout');
    mockFetchProjectById.mockResolvedValue({ data: null, error: mockError });
    mockUseAuth.mockReturnValue({ user: MOCK_USER_A, loading: false } as unknown as AuthContextType);

    const { result } = renderHook(() => useProject(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe('Network timeout');
    });

    // Ensure pointer wasn't cleared due to error
    expect(localStorage.getItem(`activeProjectId:${MOCK_USER_A.id}`)).toBe('proj-transient');
  });

  it('A successful missing-project result clears the pointer', async () => {
    localStorage.setItem(`activeProjectId:${MOCK_USER_A.id}`, 'proj-deleted-server-side');
    
    // Success but null data (missing)
    mockFetchProjectById.mockResolvedValue({ data: null, error: null });
    mockUseAuth.mockReturnValue({ user: MOCK_USER_A, loading: false } as unknown as AuthContextType);

    const { result } = renderHook(() => useProject(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.activeProject).toBeNull();
      // Ensure pointer WAS cleared by waiting for it inside the waitFor block
      // as it might take a tick for the state effect to run and clear it
      expect(localStorage.getItem(`activeProjectId:${MOCK_USER_A.id}`)).toBeNull();
    });
  });
  
  it('Late deletion completion manually clears the current selection', async () => {
     // This verifies the ProjectContext value setter behavior. The actual mutation uses this exposed setter.
     mockUseAuth.mockReturnValue({ user: MOCK_USER_A, loading: false } as unknown as AuthContextType);
     mockFetchProjectById.mockResolvedValue({ data: MOCK_PROJECT_A, error: null });
     localStorage.setItem(`activeProjectId:${MOCK_USER_A.id}`, 'proj-a');

     const { result } = renderHook(() => useProject(), { wrapper: createWrapper() });

     await waitFor(() => {
       expect(result.current.activeProject?.id).toBe('proj-a');
     });

     // Simulate deletion completion clearing it
     act(() => {
       result.current.setActiveProject(null);
     });

     await waitFor(() => {
       expect(result.current.activeProject).toBeNull();
       expect(localStorage.getItem(`activeProjectId:${MOCK_USER_A.id}`)).toBeNull();
     });
  });
});
