
// Import the debug info type from the modules folder
import { AIDebugInfo, setDebugInfo, getLastDebugInfo as getDebugInfo } from "./modules/debugInfo";
import { generateWithAI as generateWithAIImpl } from "./modules/aiGenerator";
import { Project } from "@/types/project";
import { SliderQuestion } from "@/services/types/designTypes";

// Re-export the AIDebugInfo type
export type { AIDebugInfo };

// This is the last debug info stored from the AI generation
let lastDebugInfo: AIDebugInfo | null = null;

// Export the debug info getter
export const getLastDebugInfo = () => {
  return lastDebugInfo || getDebugInfo();
};

// Export the debug info setter
export const setLastDebugInfo = (debugInfo: AIDebugInfo | null) => {
  lastDebugInfo = debugInfo;
  // Also update the module's debug info
  if (debugInfo) {
    setDebugInfo(debugInfo);
  }
};

// Export the generate with AI function
export const generateWithAI = async (
  factors: string[],
  activeProject: Project | null,
  options?: { isDemo?: boolean }
): Promise<SliderQuestion[] | null> => {
  const result = await generateWithAIImpl(factors, activeProject, options);

  // Capture the debug info
  const currentDebugInfo = getDebugInfo();
  if (currentDebugInfo) {
    setLastDebugInfo(currentDebugInfo);
  }

  return result;
};
