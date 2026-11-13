import { debugError, debugLog } from "@/utils/debugLogger";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { FormAppearance } from "../types";
import { saveActivityResponse } from "@/services/supabaseSync/operations/save/saveActivityResponse";
import { clearActivityCache } from "@/services/supabaseSync/operations/cache/responseCache";

/**
 * Hook to handle saving form appearance data
 */
export const useSaveAppearance = () => {
  const [isSaving, setIsSaving] = useState(false);

  const saveAppearance = async (
    projectId: string | undefined,
    dataToSave: FormAppearance,
    sourcePath: string
  ): Promise<boolean> => {
    if (!projectId) {
      debugError("Cannot save without project ID");
      return false;
    }

    debugLog(`[saveAppearance] Saving appearance data to build phase from route ${sourcePath}:`, dataToSave);
    setIsSaving(true);

    try {
      const finalData = { ...dataToSave };
      if (finalData.logoUrl && finalData.logoUrl.startsWith('blob:')) {
        finalData.logoUrl = '';
      }

      // Always ensure we're using the 'build' phase for form appearance data
      const success = await saveActivityResponse(
        projectId,
        'build', // Always use 'build' phase
        'form-appearance',
        'form-appearance-editor',
        {
          ...finalData,
          _updatedAt: new Date().toISOString(),
          _savedFrom: sourcePath
        }
      );

      if (success) {
        debugLog("[saveAppearance] Save successful");

        // Clear the cache for this specific activity to ensure fresh data is loaded next time
        clearActivityCache(projectId, 'build', 'form-appearance', 'form-appearance-editor');
        clearActivityCache(projectId, 'collect', 'form-appearance', 'form-appearance-editor');
        clearActivityCache(projectId, 'design', 'form-appearance', 'form-appearance-editor');

        toast({
          title: "Appearance saved",
          description: "Your form appearance settings have been saved successfully."
        });
      } else {
        debugError("[saveAppearance] Save failed");
        toast({
          title: "Save failed",
          description: "Failed to save appearance. Please try again.",
          variant: "destructive"
        });
      }

      return success;
    } catch (error) {
      debugError("[saveAppearance] Error saving appearance:", error);
      toast({
        title: "Save failed",
        description: "An error occurred while saving appearance settings.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { isSaving, saveAppearance };
};
