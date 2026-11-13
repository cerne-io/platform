
import { useState, useEffect, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { ActivityFormData } from "@/types/activity";
import { useActivityResponses } from "@/hooks/activity"; // Use the updated import path
import { toast } from "@/components/ui/use-toast";
import { clearActivityCache, generateCacheKey, setCachedResponse } from "@/services/cache/activityResponseCache";
import { debugLog, debugError, debugWarn } from "@/utils/debugLogger";

interface UseActivityFormProps {
  phaseId: string;
  stepId: string;
  activityId: string;
  onSaved?: () => void;
  initialEditMode?: boolean;
}

export const useActivityForm = ({ phaseId, stepId, activityId, onSaved, initialEditMode = false }: UseActivityFormProps) => {
  const { activeProject } = useProject();
  const [formData, setFormData] = useState<ActivityFormData>({});
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [lastProjectId, setLastProjectId] = useState<string | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState<boolean>(initialEditMode || true);
  const [isDirty, setIsDirty] = useState(false);

  // Destructure both loading and saving properties correctly
  const { loading, saving, fetchActivityResponse, saveActivityResponse } = useActivityResponses(activeProject?.id || "");

  const loadActivityData = useCallback(async (forceRefresh = false) => {
    if (!activeProject?.id) return;

    setIsLoading(true);
    try {
      debugLog(`Loading activity data for project ${activeProject.id}, phase ${phaseId}, step ${stepId}, activity ${activityId} with forceRefresh=${forceRefresh}`);

      // If forceRefresh is true, clear the activity cache first
      if (forceRefresh && activeProject.id) {
        debugLog(`Clearing cache for activity ${activityId}`);
        clearActivityCache(activeProject.id, phaseId, stepId, activityId);
      }

      const data = await fetchActivityResponse<ActivityFormData>(
        phaseId,
        stepId,
        activityId,
        {} as ActivityFormData,
        'ar_response',
        forceRefresh
      );
      if (data) {
        debugLog("Found activity data:", data);
        // Ensure we're setting the correct type for the form data
        const typedData: ActivityFormData = {};

        // Convert the response to ensure it matches ActivityFormData type
        if (typeof data === 'object' && data !== null) {
          Object.entries(data).forEach(([key, value]) => {
            if (typeof value === 'string') {
              typedData[key] = value;
            }
          });
        }

        // Check if there's any meaningful data (non-empty values)
        const hasData = Object.values(typedData).some(value => value && value.trim() !== '');

        setFormData(typedData);
        setIsDirty(false); // Reset dirty state on load

        // Use initialEditMode if provided, otherwise default logic
        const shouldBeEditMode = initialEditMode ? true : !hasData;
        setIsEditMode(shouldBeEditMode);
        setSavedSuccessfully(hasData); // Consider existing data as saved only if it has content
      } else {
        debugLog("No activity data found, using empty object");
        setFormData({});
        setIsDirty(false); // Reset dirty state on load
        setIsEditMode(true); // No data, so we're in edit mode
        setSavedSuccessfully(false);
      }
    } catch (error) {
      debugError("Error loading activity data:", error);
      toast({
        title: "Error",
        description: "Failed to load activity data",
        variant: "destructive",
      });
      setIsEditMode(true);
    } finally {
      setIsLoading(false);
    }
  }, [activeProject?.id, phaseId, stepId, activityId, fetchActivityResponse, initialEditMode]);

  // Function to force refresh data
  const refreshData = useCallback(() => {
    debugLog(`Forcing refresh of data for ${activityId}`);
    void loadActivityData(true); // Pass true to force a refresh
  }, [loadActivityData, activityId]);

  useEffect(() => {
    if (activeProject?.id) {
      // If project changed, reset form data
      if (lastProjectId && activeProject.id !== lastProjectId) {
        debugLog(`Project changed from ${lastProjectId} to ${activeProject.id}, clearing form data`);
        setFormData({});
        setIsDirty(false);
        setSavedSuccessfully(false);
        setIsEditMode(true);
      }
      setLastProjectId(activeProject.id);

      // Load activity data for the current project
      void loadActivityData();
    }
  }, [activeProject?.id, loadActivityData, lastProjectId, phaseId, stepId, activityId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    debugLog(`Field changed: ${name} = ${value}`);
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    setIsDirty(true);

    if (savedSuccessfully) {
      setSavedSuccessfully(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeProject?.id) {
      toast({
        title: "Error",
        description: "No active project selected",
        variant: "destructive",
      });
      return;
    }

    debugLog("Submitting form data:", formData);
    debugLog(`Saving to: project=${activeProject.id}, phase=${phaseId}, step=${stepId}, activity=${activityId}`);

    try {
      // Save the form data to the backend (store plain response, no wrapper)
      const success = await saveActivityResponse(phaseId, stepId, activityId, formData);

      if (success) {
        debugLog("Save was successful");

        // Give immediate feedback to the user
        toast({
          title: "Success",
          description: "Your response has been saved",
        });

        // Set flag for UI feedback and preserve current form data
        setSavedSuccessfully(true);
        setIsEditMode(false);
        setIsDirty(false); // Reset dirty state on successful save

        // Update cache so any immediate reloads get the latest value
        if (activeProject?.id) {
          try {
            const cacheKey = generateCacheKey(activeProject.id, phaseId, stepId, activityId);
            setCachedResponse(cacheKey, formData, activeProject.id, phaseId, stepId, activityId);
            debugLog(`Updated cache for ${cacheKey} after save`);
          } catch (e) {
            debugWarn("Failed to update cache after save", e);
          }
        }

        // Force refresh from server to ensure latest state is displayed
        try {
          refreshData();
        } catch (e) {
          debugWarn("Failed to refresh after save", e);
        }

        // Call onSaved callback if provided without forcing a refresh
        if (onSaved) {
          onSaved();
        }
      } else {
        debugLog("Save was not successful");
        setSavedSuccessfully(false);
        toast({
          title: "Save Failed",
          description: "Your response could not be saved. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      debugError("Error saving form data:", error);
      toast({
        title: "Error",
        description: "Failed to save your response",
        variant: "destructive",
      });
    }
  };

  const handleEdit = () => {
    debugLog(`Entering edit mode for ${activityId} - preserving current form data`);
    setIsEditMode(true);
    setSavedSuccessfully(false);
  };

  return {
    formData,
    isLoading,
    loading,
    saving,
    savedSuccessfully,
    isEditMode,
    isDirty,
    handleInputChange,
    handleSubmit,
    handleEdit,
    refreshData,
    activeProject
  };
};
