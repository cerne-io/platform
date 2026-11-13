/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useCallback, useMemo, useState, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProjectById } from '@/services/projectService';
import { Project } from '@/types/project';
import { projectKeys } from '@/hooks/queries/projectKeys';
import { debugError, debugLog } from '@/utils/debugLogger';

// Expose the error to consumers and add retry
interface ProjectContextValue {
  activeProject: Project | null;
  setActiveProject: (p: Project | null) => void;
  currentUserProjectRole: Project['user_role'] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

const getStorageKey = (userId: string) => `activeProjectId:${userId}`;
const LEGACY_ID_KEY = 'activeProjectId';
const LEGACY_JSON_KEY = 'activeProject';

type Selection = {
  userId: string | null;
  projectId: string | null;
  restored: boolean;
};

// Safe storage access to prevent SecurityError crashes
const safeStorage = {
  get: (store: Storage, key: string) => {
    try { return store.getItem(key); } catch { return null; }
  },
  set: (store: Storage, key: string, value: string) => {
    try { store.setItem(key, value); } catch (e) { debugError(`Storage set failed for ${key}`, e); }
  },
  remove: (store: Storage, key: string) => {
    try { store.removeItem(key); } catch (e) { debugError(`Storage remove failed for ${key}`, e); }
  }
};

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const [selection, setSelection] = useState<Selection>({
    userId: null,
    projectId: null,
    restored: false,
  });

  // 1. Identity transition & legacy restoration effect
  useEffect(() => {
    if (authLoading) return; // Wait for auth to be ready

    if (!userId) {
      setSelection({ userId: null, projectId: null, restored: true });
      return;
    }

    // Only restore if we haven't already restored for this specific user
    if (selection.restored && selection.userId === userId) {
      return;
    }

    const scopedKey = getStorageKey(userId);
    const scopedId = safeStorage.get(localStorage, scopedKey);
    
    if (scopedId) {
      // We have a scoped ID, simple restore
      setSelection({ userId, projectId: scopedId, restored: true });
      return;
    }

    // --- Legacy Migration Path ---
    let legacyId = safeStorage.get(localStorage, LEGACY_ID_KEY) || safeStorage.get(sessionStorage, LEGACY_ID_KEY);
    
    // Fallback to legacy JSON payload if ID key is missing
    if (!legacyId) {
      const legacyJson = safeStorage.get(localStorage, LEGACY_JSON_KEY);
      if (legacyJson) {
        try {
          const parsed = JSON.parse(legacyJson);
          if (parsed && typeof parsed.id === 'string' && parsed.id.trim() !== '') {
            legacyId = parsed.id;
          }
        } catch {
          // Invalid JSON
        }
      }
    }

    // In legacy mode, we don't persist it as scoped yet. We hold it in memory,
    // fetch it, and only persist + delete legacy keys on success.
    if (legacyId) {
      debugLog(`Found legacy project selection ${legacyId}, treating as migration candidate.`);
      setSelection({ userId, projectId: legacyId, restored: true });
    } else {
      // Nothing to restore
      setSelection({ userId, projectId: null, restored: true });
    }
  }, [userId, authLoading, selection.userId, selection.restored]);

  const selectionReady = !authLoading && selection.restored && selection.userId === userId;
  const activeProjectId = selectionReady ? selection.projectId : null;
  const queryEnabled = selectionReady && userId !== null && activeProjectId !== null;

  // 2. Fetch via TanStack Query using identity-scoped key
  const { data: projectData, isLoading, error, isSuccess, refetch } = useQuery({
    queryKey: projectKeys.detail(userId, activeProjectId),
    enabled: queryEnabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryFn: async () => {
      const { data, error } = await fetchProjectById(activeProjectId!);
      if (error) throw error;
      return data;
    },
  });

  // Derived state to mask data until selection is ready
  const activeProject = selectionReady ? (projectData ?? null) : null;
  const exposedError = selectionReady ? (error as Error | null) : null;
  const isContextLoading = authLoading || !selection.restored || (queryEnabled && isLoading);

  // 3. Handle query results (cleanup missing or persist successful legacy migration)
  useEffect(() => {
    if (!queryEnabled || !userId || !activeProjectId) return;

    if (isSuccess) {
      if (activeProject === null) {
        // Project confirmed missing/inaccessible
        debugLog(`Project ${activeProjectId} is inaccessible or missing. Clearing selection.`);
        setSelection(s => ({ ...s, projectId: null }));
        safeStorage.remove(localStorage, getStorageKey(userId));
        
        // Also cleanup legacy if it was a candidate
        safeStorage.remove(localStorage, LEGACY_ID_KEY);
        safeStorage.remove(sessionStorage, LEGACY_ID_KEY);
        safeStorage.remove(localStorage, LEGACY_JSON_KEY);
      } else {
        // Successful fetch. If this was a legacy candidate (i.e. we don't have a scoped key yet),
        // we can safely persist it now and clean up the legacy keys.
        const scopedKey = getStorageKey(userId);
        if (!safeStorage.get(localStorage, scopedKey)) {
           debugLog(`Legacy candidate ${activeProjectId} validated. Upgrading to scoped persistence.`);
           safeStorage.set(localStorage, scopedKey, activeProjectId);
           
           // Ensure legacy cleanup requires a successful scoped write
           if (safeStorage.get(localStorage, scopedKey) === activeProjectId) {
             safeStorage.remove(localStorage, LEGACY_ID_KEY);
             safeStorage.remove(sessionStorage, LEGACY_ID_KEY);
             safeStorage.remove(localStorage, LEGACY_JSON_KEY);
           }
        }
      }
    }
  }, [queryEnabled, isSuccess, activeProject, activeProjectId, userId]);

  // 4. Reactive Selection Setter
  const setActiveProject = useCallback(
    (project: Project | null) => {
      const nextId = project?.id ?? null;
      
      if (project && userId) {
        // Pre-seed the cache to prevent loading flashes when navigating from the projects list
        queryClient.setQueryData(projectKeys.detail(userId, nextId), project);
      }
      
      setSelection(s => ({
        ...s,
        projectId: nextId
      }));

      if (userId) {
        const scopedKey = getStorageKey(userId);
        if (nextId) {
          safeStorage.set(localStorage, scopedKey, nextId);
        } else {
          safeStorage.remove(localStorage, scopedKey);
        }
      }
    },
    [userId, queryClient]
  );

  const value = useMemo<ProjectContextValue>(() => ({
    activeProject,
    setActiveProject,
    currentUserProjectRole: activeProject?.user_role ?? null,
    isLoading: isContextLoading,
    error: exposedError,
    refetch: () => {
       if (queryEnabled) void refetch();
    }
  }), [activeProject, setActiveProject, isContextLoading, exposedError, refetch, queryEnabled]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = (): ProjectContextValue => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within a ProjectProvider');
  return ctx;
};

export const useOptionalProject = (): ProjectContextValue | null => {
  return useContext(ProjectContext) ?? null;
};
