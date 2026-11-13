import { useState, useEffect, useRef, useCallback } from "react";
import { debugError, debugWarn } from "@/utils/debugLogger";
import { useLocation } from "react-router-dom";
import { useAppearanceState } from "./useAppearanceState";
import { useAuthCheck } from "./useAuthCheck";
import { useSaveAppearance } from "./useSaveAppearance";
import { useProjectResolution } from "./useProjectResolution";
import { defaultAppearance, FormAppearance } from "../types";
import { fetchActivityResponse } from "@/services/supabaseSync/operations/fetch/fetchActivityResponse";
import { saveActivityResponse } from "@/services/supabaseSync/operations/save/saveActivityResponse";
import { validateAppearanceData } from "../utils/appearanceValidation";
import { useTemplateStatus } from "./useTemplateStatus";
import { clearActivityCache } from "@/services/supabaseSync/operations/cache/responseCache";

import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export const useFormAppearanceEditor = (projectId?: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [appearanceError, setAppearanceError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [hasBlobUrl, setHasBlobUrl] = useState(false);
  const { pathname, search } = useLocation();
  const currentRoute = pathname + search;
  const isEditing = useRef(false);
  const [lastSavedAppearance, setLastSavedAppearance] = useState<FormAppearance | null>(null);
  const [saveCompleted, setSaveCompleted] = useState(false);
  const [directSaveCompleted, setDirectSaveCompleted] = useState(false);

  // Check project resolution status
  const {
    isResolving: isResolvingProject,
    resolutionError: projResError,
    debugInfo: projectResolutionDebugInfo
  } = useProjectResolution(projectId);

  // Use the original projectId 
  const effectiveProjectId = projectId;

  // Check authentication status
  const { isAuthenticated, authChecked } = useAuthCheck();

  // Check if this is a template project
  const {
    isTemplateProject,
    isReadOnly,
    canSaveChanges
  } = useTemplateStatus(effectiveProjectId);

  // Form appearance state
  const {
    appearance,
    setAppearance,
    handleBackgroundColorChange,
    handleHeaderTextChange,
    handleSubheaderTextChange,
    resetAppearance
  } = useAppearanceState(lastSavedAppearance || null);

  // Save appearance hook
  const { isSaving } = useSaveAppearance();

  // Debug information for development
  const editorDebugInfo = {
    effectiveProjectId,
    appearance,
    isAuthenticated,
    authChecked,
    isTemplateProject,
    isReadOnly,
    isEditing: isEditing.current,
    projectResolutionInfo: projectResolutionDebugInfo
  };

  // Load appearance data from the database
  const loadAppearance = useCallback(async (forceRefresh = false) => {
    if (!effectiveProjectId) {
      debugError("Cannot load appearance without a project ID");
      return false;
    }

    // Don't reload if we're currently editing to prevent losing changes
    if (isEditing.current && !forceRefresh) {
      return false;
    }

    try {
      setIsLoading(true);

      // IMPORTANT: Always load from the build phase for form appearance
      // This is the only location where form appearance data should be stored
      const response = await fetchActivityResponse(
        effectiveProjectId,
        'build',
        'form-appearance',
        'form-appearance-editor',
        null, // Default value
        null, // Response key
        true  // Force refresh to bypass cache
      );

      if (response) {

        // Validate and sanitize the response data
        const validatedAppearance = validateAppearanceData(response);
        setAppearance(validatedAppearance);
        setLastSavedAppearance(validatedAppearance);
        setAppearanceError(null);
        return true;
      } else {
        setAppearance({ ...defaultAppearance });
        setLastSavedAppearance({ ...defaultAppearance });
        return false;
      }
    } catch (err) {
      debugError("Error loading form appearance:", err);
      setAppearance({ ...defaultAppearance });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [effectiveProjectId, setAppearance, setLastSavedAppearance]);

  // Initial load of appearance data
  useEffect(() => {
    if (effectiveProjectId) {
      void loadAppearance();
    }
  }, [effectiveProjectId, loadAppearance]);

  // Effect to reload after a successful save
  useEffect(() => {
    if (saveCompleted) {
      const reloadTimer = setTimeout(() => {
        void loadAppearance(true);
        setSaveCompleted(false);
      }, 500); // Increased timeout to ensure database has processed the save

      return () => clearTimeout(reloadTimer);
    }
  }, [saveCompleted, loadAppearance]);

  // Effect to reload after a direct save
  useEffect(() => {
    if (directSaveCompleted) {
      const reloadTimer = setTimeout(() => {
        void loadAppearance(true);
        setDirectSaveCompleted(false);
      }, 1000); // Longer timeout for direct save to ensure DB consistency

      return () => clearTimeout(reloadTimer);
    }
  }, [directSaveCompleted, loadAppearance]);

  // Handle resolution errors
  useEffect(() => {
    setResolutionError(projResError);
    setIsResolving(isResolvingProject);
  }, [projResError, isResolvingProject]);

  // Mark we're editing when appearance changes
  useEffect(() => {
    if (!isLoading) {
      isEditing.current = true;
    }
  }, [appearance, isLoading]);

  // Direct save method using Supabase
  const directSaveToSupabase = async (dataToSave: Record<string, unknown>) => {
    if (!effectiveProjectId) {
      toast({
        title: "Save error",
        description: "Cannot save - no project ID available",
        variant: "destructive"
      });
      return false;
    }

    try {
      // First check if a record already exists
      const { data: existingData, error: fetchError } = await supabase
        .from('activity_responses')
        .select('id')
        .eq('ar_project_id', effectiveProjectId)
        .eq('ar_phase_id', 'build')
        .eq('ar_step_id', 'form-appearance')
        .eq('ar_activity_id', 'form-appearance-editor')
        .maybeSingle();

      if (fetchError) {
        debugError("Error checking for existing record:", fetchError);
        toast({
          title: "Database error",
          description: `Failed to check database: ${fetchError.message}`,
          variant: "destructive"
        });
        return false;
      }

      const timestamp = new Date().toISOString();

      if (existingData) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('activity_responses')
          .update({
            ar_response: dataToSave as unknown as Json,
            updated_at: timestamp
          })
          .eq('id', existingData.id)
          .select();

        if (updateError) {
          debugError("Error updating form appearance:", updateError);
          toast({
            title: "Update failed",
            description: `Database update error: ${updateError.message}`,
            variant: "destructive"
          });
          return false;
        }


      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('activity_responses')
          .insert({
            ar_project_id: effectiveProjectId,
            ar_phase_id: 'build',
            ar_step_id: 'form-appearance',
            ar_activity_id: 'form-appearance-editor',
            ar_response: dataToSave as unknown as Json,
            updated_at: timestamp
          })
          .select();

        if (insertError) {
          debugError("Error inserting form appearance:", insertError);
          toast({
            title: "Save failed",
            description: `Database insert error: ${insertError.message}`,
            variant: "destructive"
          });
          return false;
        }


      }

      // Clear the cache entries
      clearActivityCache(effectiveProjectId, 'build', 'form-appearance', 'form-appearance-editor');
      clearActivityCache(effectiveProjectId, 'collect', 'form-appearance', 'form-appearance-editor');
      clearActivityCache(effectiveProjectId, 'design', 'form-appearance', 'form-appearance-editor');

      toast({
        title: "Appearance saved",
        description: "Your form appearance settings have been saved directly to the database.",
      });

      return true;
    } catch (err) {
      debugError("Unexpected error saving form appearance directly:", err);
      toast({
        title: "Save error",
        description: "An unexpected error occurred during direct save.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Handler for saving appearance - directly use saveActivityResponse
  const handleSave = async () => {

    if (!effectiveProjectId) {
      setAppearanceError("Cannot save appearance: No project ID available");
      return false;
    }

    try {
      // Set to saving state
      const startTime = Date.now();

      // Check if logoUrl is a blob URL - if so, the upload may have failed
      if (appearance.logoUrl && appearance.logoUrl.startsWith('blob:')) {
        debugWarn("Cannot save - logo upload may have failed or is still in progress.");
        toast({
          title: "Logo not uploaded",
          description: "The logo upload failed or is incomplete. Please try uploading again.",
          variant: "destructive"
        });
        return false;
      }

      // Prepare the data to save with metadata and ensure multi-language structure
      const headerObj = typeof appearance.headerText === 'object' && appearance.headerText !== null
        ? appearance.headerText
        : { en: appearance.headerText || "" };

      const subheaderObj = typeof appearance.subheaderText === 'object' && appearance.subheaderText !== null
        ? appearance.subheaderText
        : { en: appearance.subheaderText || "" };

      const dataToSave = {
        ...appearance,
        headerText: headerObj,
        subheaderText: subheaderObj,
        _updatedAt: new Date().toISOString(),
        _savedFrom: currentRoute
      };

      // Try direct save first (more reliable)
      const directSaveSuccess = await directSaveToSupabase(dataToSave);

      if (directSaveSuccess) {
        // Update the last saved appearance to match what we just saved
        setLastSavedAppearance({ 
          ...appearance, 
          headerText: headerObj, 
          subheaderText: subheaderObj 
        });

        // Mark that direct save has completed to trigger reload
        setDirectSaveCompleted(true);

        isEditing.current = false;
        return true;
      }

      // Fallback to RPC method if direct save fails

      // Always use the build phase for form appearance
      const saveSuccess = await saveActivityResponse(
        effectiveProjectId,
        'build',
        'form-appearance',
        'form-appearance-editor',
        dataToSave
      );

      if (saveSuccess) {
        // Update the last saved appearance to match what we just saved
        setLastSavedAppearance({ 
          ...appearance, 
          headerText: headerObj, 
          subheaderText: subheaderObj 
        });

        // Mark that save has completed to trigger reload
        setSaveCompleted(true);

        // Clear the cache everywhere to ensure fresh data is loaded next time
        clearActivityCache(effectiveProjectId, 'build', 'form-appearance', 'form-appearance-editor');
        clearActivityCache(effectiveProjectId, 'collect', 'form-appearance', 'form-appearance-editor');
        clearActivityCache(effectiveProjectId, 'design', 'form-appearance', 'form-appearance-editor');

        toast({
          title: "Appearance saved",
          description: `Your form appearance settings have been saved successfully (${Date.now() - startTime}ms).`,
        });

        isEditing.current = false;
        return true;
      }

      toast({
        title: "Save failed",
        description: "Could not save form appearance. Please try again.",
        variant: "destructive"
      });

      return false;
    } catch (err) {
      debugError("Error saving form appearance:", err);
      setAppearanceError("Error saving: " + (err instanceof Error ? err.message : "Unknown error"));

      toast({
        title: "Save error",
        description: "An error occurred while saving the form appearance.",
        variant: "destructive"
      });

      return false;
    }
  };

  // Handler for resetting appearance to defaults
  const handleReset = () => {
    resetAppearance();
    isEditing.current = true;
  };

  // Handler for reloading appearance from the database
  const handleReload = () => {
    isEditing.current = false;
    void loadAppearance(true); // Force refresh from database
  };

  // Handler for fixing blob URLs in appearance
  const handleBlobUrlFixed = () => {
    setHasBlobUrl(false);
  };

  return {
    appearance,
    isLoading,
    isSaving,
    isAuthenticated,
    authChecked,
    debugInfo: editorDebugInfo, // Return renamed debug info
    isResolving,
    resolutionError,
    hasBlobUrl,
    appearanceError,
    canSaveChanges,
    handleSave,
    handleReset,
    handleBackgroundColorChange,
    handleHeaderTextChange,
    handleSubheaderTextChange,
    handleReload,
    handleBlobUrlFixed,
    projectId: effectiveProjectId,
    currentRoute
  };
};
