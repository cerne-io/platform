import { useState, useEffect, useCallback } from 'react';
import {
  isActivityCompleted,
  markActivityCompleted,
  CompletionPhase,
  CompletionStep,
  CompletionActivity
} from '@/services/completionState/completionStateService';
import { debugLog } from '@/utils/debugLogger';

interface UseCompletionStateProps {
  projectId: string | null | undefined;
  phase: CompletionPhase;
  step: CompletionStep;
  activity: CompletionActivity;
  enabled?: boolean;
}

/**
 * Hook to manage activity completion state with server-side validation
 * Replaces localStorage-based completion tracking
 */
export const useCompletionState = ({
  projectId,
  phase,
  step,
  activity,
  enabled = true
}: UseCompletionStateProps) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);

  // Load completion state from database
  const loadCompletionState = useCallback(async () => {
    if (!enabled || !projectId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const completed = await isActivityCompleted({
        projectId,
        phase,
        step,
        activity
      });

      setIsCompleted(completed);
      debugLog(`Completion state loaded for ${activity}:`, completed);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, phase, step, activity, enabled]);

  // Mark activity as completed
  const markCompleted = useCallback(async (): Promise<boolean> => {
    if (!projectId) {
      return false;
    }

    try {
      setIsMarking(true);
      const success = await markActivityCompleted({
        projectId,
        phase,
        step,
        activity
      });

      if (success) {
        setIsCompleted(true);
      }

      return success;
    } finally {
      setIsMarking(false);
    }
  }, [projectId, phase, step, activity]);

  // Load state on mount and when dependencies change
  useEffect(() => {
    void loadCompletionState();
  }, [loadCompletionState]);

  return {
    isCompleted,
    isLoading,
    isMarking,
    markCompleted,
    refreshState: loadCompletionState
  };
};
