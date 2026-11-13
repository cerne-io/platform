import { saveActivityResponse } from "./supabaseSync/operations";
import { debugError } from "@/utils/debugLogger";
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGES, ProjectLanguages } from "@/constants/languages";

export { DEFAULT_LANGUAGES, SUPPORTED_LANGUAGES };
export type { ProjectLanguages };

import { supabase } from "@/integrations/supabase/client";

/**
 * Gets the language configuration for a project
 */
export const getProjectLanguages = async (projectId: string): Promise<ProjectLanguages> => {
  if (!projectId) return DEFAULT_LANGUAGES;

  try {
    // We use a direct query here (like Form Appearance) to avoid authenticated-only wrappers
    // and ensure public accessibility for the form.
    const { data, error } = await supabase
      .from('activity_responses')
      .select('ar_response')
      .eq('ar_project_id', projectId)
      .eq('ar_phase_id', "build")
      .eq('ar_step_id', "form-appearance")
      .eq('ar_activity_id', "form-languages")
      .maybeSingle();

    if (error) {
      debugError("Error fetching project languages from Supabase:", error);
      return DEFAULT_LANGUAGES;
    }

    if (data?.ar_response && typeof data.ar_response === "object" && Array.isArray((data.ar_response as Record<string, unknown>).enabledLanguages)) {
      return data.ar_response as unknown as ProjectLanguages;
    }
  } catch (error) {
    debugError("Error fetching project languages:", error);
  }

  return DEFAULT_LANGUAGES;
};

/**
 * Saves the language configuration for a project
 */
export const saveProjectLanguages = async (
  projectId: string,
  languages: ProjectLanguages
): Promise<boolean> => {
  if (!projectId) return false;

  try {
    const success = await saveActivityResponse(
      projectId,
      "build",
      "form-appearance",
      "form-languages",
      languages
    );
    return success;
  } catch (error) {
    debugError("Error saving project languages:", error);
    return false;
  }
};
/**
 * Exported service object for easier usage in components
 */
export const formLanguageService = {
  getLanguageConfig: getProjectLanguages,
  saveLanguageConfig: saveProjectLanguages,
};
