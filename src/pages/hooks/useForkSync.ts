import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Project } from "@/types/project";
import {
  getEffectiveProjectId,
  getSavedForkChoice,
  isForkDismissedForProject,
  persistForkChoice
} from "@/services/utils/storageUtils";

interface UseForkSyncOptions {
  activeProject: Project | null;
  allSteps: Array<{ id: string; phaseId: string }>;
  completedActivitiesSize: number;
  currentStepId: string;
  isCompletionLoading: boolean;
  setShowFork: (show: boolean) => void;
  setCurrentStepId: (id: string) => void;
  setSearchParams: ReturnType<typeof useSearchParams>[1];
}

/**
 * Handles the three-way sync between:
 * 1. URL ?step= param
 * 2. Active project / persisted fork choice
 * 3. showFork visibility flag
 *
 * Extracted from Design.tsx to reduce cognitive complexity.
 */
export function useForkSync({
  activeProject,
  allSteps,
  completedActivitiesSize,
  currentStepId,
  isCompletionLoading,
  setShowFork,
  setCurrentStepId,
  setSearchParams,
}: UseForkSyncOptions) {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const pid = activeProject?.id || getEffectiveProjectId(activeProject);
    const urlStep = searchParams.get('step');

    // Priority 1: URL step parameter wins
    if (urlStep) {
      if (urlStep !== currentStepId && allSteps.some(step => step.id === urlStep)) {
        setCurrentStepId(urlStep);
      }
      setShowFork(false);
      persistForkChoice(pid, urlStep);
      return;
    }

    // Priority 2: Wait for completion data before deciding on fork
    if (isCompletionLoading) {
      return;
    }

    // Priority 3: Check for a previously saved choice or existing work
    const savedChoice = getSavedForkChoice(pid);
    const hasPriorWork = isForkDismissedForProject(pid) || completedActivitiesSize > 0;

    if (savedChoice || hasPriorWork) {
      const targetStep = (savedChoice && allSteps.some(s => s.id === savedChoice))
        ? savedChoice
        : (currentStepId && allSteps.some(s => s.id === currentStepId) ? currentStepId : 'story-question');

      setShowFork(false);
      setCurrentStepId(targetStep);
      setSearchParams({ step: targetStep }, { replace: true });
    } else {
      setShowFork(true);
    }
  }, [activeProject, allSteps, completedActivitiesSize, currentStepId, isCompletionLoading, searchParams, setSearchParams, setShowFork, setCurrentStepId]);
}
