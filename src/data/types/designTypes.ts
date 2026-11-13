
import React from "react";

// Define the design step types
export interface DesignActivity {
  id: string;
  title: string;
  description: string;
  component?: React.ReactNode;
  hideActivityContent?: boolean; // Add this property to control ActivityContent visibility
}

export interface DesignStep {
  id: string;
  title: string;
  description: string;
  activities: DesignActivity[];
  component?: React.ReactNode;
}

export interface DesignPhase {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  steps: DesignStep[];
  tooltipKey?: string;
}
