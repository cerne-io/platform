
import { DesignPhase } from "./types/designTypes";
import { contextPhase } from "./phases/contextPhase";
import { definePhase } from "./phases/definePhase";
import { designPhase } from "./phases/designPhase";
import { buildPhase } from "./phases/buildPhase";

// Export the component interfaces for use in other files
export type { DesignActivity, DesignStep, DesignPhase } from "./types/designTypes";

import { useMemo } from "react";

// Combine all phases into a single hook
export const useProjectPhases = () => {
  const projectPhases: DesignPhase[] = useMemo(() => [
    contextPhase,
    definePhase,
    designPhase,
    buildPhase
  ], []);

  return projectPhases;
};
