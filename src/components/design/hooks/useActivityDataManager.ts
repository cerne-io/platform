import { debugError } from "@/utils/debugLogger";
import { useState, useEffect, useCallback } from "react";
import { fetchActivityResponse } from "@/services/supabaseSync/operations";
import { ActivityFormData } from "@/types/activity";
import { toast } from "@/components/ui/use-toast";

import { clearActivityCache } from "@/services/cache/activityResponseCache";
import { useInvalidateActivityCompletion } from "@/hooks/mutations/useInvalidateActivityCompletion";

interface DesignActivity {
  id: string;
  title: string;
  description: string;
}

export const useActivityDataManager = (
  projectId: string | undefined,
  phaseId: string,
  currentStep: string,
  stepActivities: DesignActivity[],
  isTemplateProject: boolean
) => {
  const [activityData, setActivityData] = useState<{ [key: string]: ActivityFormData }>({});
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [lastSavedActivity, setLastSavedActivity] = useState<string | null>(null);
  const invalidateActivityCompletion = useInvalidateActivityCompletion();

  // Load data for a specific activity
  const loadActivityDataForSingleActivity = useCallback(async (activityId: string) => {
    if (!projectId) return;

    try {
      // Clear the cache for this specific activity
      clearActivityCache(projectId, phaseId, currentStep, activityId);

      // Force refresh for the specific activity
      const response = await fetchActivityResponse(projectId, phaseId, currentStep, activityId, null, null, true);

      if (response) {
        const typedActivityData: ActivityFormData = {};

        if (typeof response === 'object' && response !== null) {
          Object.entries(response).forEach(([key, value]) => {
            if (typeof value === 'string') {
              typedActivityData[key] = value;
            }
          });
        }

        // Update just this activity in the state
        setActivityData(prev => ({
          ...prev,
          [activityId]: typedActivityData
        }));
      }
    } catch (error) {
      debugError(`Error refreshing data for activity ${activityId}:`, error);
    }
  }, [projectId, phaseId, currentStep]);

  // Load all activity data
  const loadActivityData = useCallback(async () => {
    if (!projectId || !stepActivities) return;

    // 🔄 Check if we should force refresh for this project
    const forceRefreshFlag = sessionStorage.getItem(`force_refresh_${projectId}`);
    const shouldForceRefresh = forceRefreshFlag === 'true';

    if (shouldForceRefresh) {
      sessionStorage.removeItem(`force_refresh_${projectId}`);
    }

    const updates: Record<string, ActivityFormData | null> = {};
    let hasError = false;

    // Only set loading/warning if we are actually missing data we need to fetch
    // Loop through explicitly to fetch
    for (const activity of stepActivities) {
      try {
        // Force refresh if: flag is set, template project, or activity was just saved
        const forceRefresh = shouldForceRefresh || isTemplateProject || lastSavedActivity === activity.id;

        const response = await fetchActivityResponse(projectId, phaseId, currentStep, activity.id, null, null, forceRefresh);

        if (response) {
          const typedActivityData: ActivityFormData = {};

          if (typeof response === 'object' && response !== null) {
            Object.entries(response).forEach(([key, value]) => {
              if (typeof value === 'string') {
                typedActivityData[key] = value;
              }
            });
          }

          updates[activity.id] = typedActivityData;
        } else {
          // Mark for deletion if it exists
          updates[activity.id] = null;
        }
      } catch (error) {
        debugError(`Error loading data for activity ${activity.id} in phase ${phaseId}:`, error);
        hasError = true;
      }
    }

    if (hasError) {
      toast({
        title: "Warning",
        description: "Some activity data could not be loaded",
        variant: "destructive",
      });
    }

    setActivityData(prev => {
      const next = { ...prev };
      Object.entries(updates).forEach(([id, data]) => {
        if (data) {
          next[id] = data;
        } else if (Object.prototype.hasOwnProperty.call(next, id)) {
          delete next[id];
        }
      });
      return next;
    });
  }, [projectId, currentStep, phaseId, stepActivities, isTemplateProject, lastSavedActivity]);

  // Listen for storage events (story questions, slider questions, etc.)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('cerne_story_question_saved_')) {
        setRefreshCounter(prev => prev + 1);
        if (projectId) invalidateActivityCompletion(projectId);
      }
      if (e.key === 'sliderThemesSaved' && e.newValue === 'true') {
        setRefreshCounter(prev => prev + 1);
        if (projectId) invalidateActivityCompletion(projectId);
      }
      if (e.key === 'participantQuestionsSaved' && e.newValue === 'true') {
        setRefreshCounter(prev => prev + 1);
        if (projectId) invalidateActivityCompletion(projectId);
      }
      if (e.key === 'triangleQuestionsSaved' && e.newValue === 'true') {
        setRefreshCounter(prev => prev + 1);
        if (projectId) invalidateActivityCompletion(projectId);
      }
    };

    // Listen for custom activity_saved events from the window
    const handleActivitySaved = (event: CustomEvent) => {
      if (event.detail) {
        const { phaseId: savedPhaseId, stepId: savedStepId } = event.detail;
        if (projectId) invalidateActivityCompletion(projectId);
        if (savedPhaseId === phaseId && savedStepId === currentStep) {
          setRefreshCounter(prev => prev + 1);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('activity_saved', handleActivitySaved as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('activity_saved', handleActivitySaved as EventListener);
    };
  }, [phaseId, currentStep, projectId, invalidateActivityCompletion]);

  // Refresh on mount
  useEffect(() => {
    setRefreshCounter(prev => prev + 1);
  }, [phaseId]);

  // Load activity data when step changes or refresh is triggered
  useEffect(() => {
    if (!projectId || !currentStep) return;

    void loadActivityData();
  }, [currentStep, projectId, phaseId, refreshCounter, loadActivityData]);

  // Load data for a specific activity that was just saved
  useEffect(() => {
    if (lastSavedActivity && projectId) {
      void loadActivityDataForSingleActivity(lastSavedActivity);
      setLastSavedActivity(null);
    }
  }, [lastSavedActivity, projectId, loadActivityDataForSingleActivity]);

  const handleActivitySaved = async (activityId: string) => {
    try {
      // Mark this activity as recently saved
      setLastSavedActivity(activityId);

      // Invalidate activity completion query
      invalidateActivityCompletion(projectId);

      // Force immediate refresh
      await loadActivityData();

      // Set a timeout to refresh again after a short delay to ensure data is updated
      setTimeout(() => {
        // Clear the cache for this specific activity
        if (projectId) {
          clearActivityCache(projectId, phaseId, currentStep, activityId);
        }

        // Invalidate completion query again after cache clear
        invalidateActivityCompletion(projectId);

        // Trigger another refresh
        setRefreshCounter(prev => prev + 1);
      }, 500);
    } catch (error) {
      debugError(`Error refreshing data for activity ${activityId}:`, error);
    }
  };

  return {
    activityData,
    refreshCounter,
    loadActivityData,
    handleActivitySaved
  };
};
