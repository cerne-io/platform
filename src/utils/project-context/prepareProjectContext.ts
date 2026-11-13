/**
 * Prepares project context for AI generation across Story Questions, Sliders, and Triangles.
 */
import { Project } from "@/types/project";
import { getFormattedProjectContext } from "@/utils/project-context/getFormattedProjectContext";
import { clearProjectContextCache } from "@/services/cache/projectContextCache";
import { debugLog, debugError } from "@/utils/debugLogger";

export interface ContextData {
  context: string;
  rawData?: unknown;
}

/**
 * Prepares the formatted project context for AI prompts
 */
export const prepareProjectContext = async (
  project: Project
): Promise<ContextData | null> => {
  try {
    if (!project || !project.id) {
      debugError("Invalid project provided for context preparation");
      return null;
    }

    debugLog("Preparing context for project:", project.name);

    // Force refresh the context cache to ensure we have the latest data
    clearProjectContextCache(project.id);

    // Use the comprehensive context builder with forced refresh
    const context = await getFormattedProjectContext(
      project.id,
      project.name,
      project.description || undefined,
      true // Force refresh to get the latest data
    );

    if (!context || context.includes("Error generating project context")) {
      debugError("Failed to build project context");
      return null;
    }

    debugLog("Successfully built comprehensive context of length:", context.length);

    return {
      context,
      rawData: {
        projectName: project.name,
        projectId: project.id,
        contextLength: context.length
      }
    };
  } catch (error) {
    debugError("Error preparing project context:", error);
    return null;
  }
};
