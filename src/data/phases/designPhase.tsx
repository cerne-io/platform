import React from "react";
import { PenTool } from "lucide-react";
import { DesignPhase } from "../types/designTypes";
import FormBuilderStudio from "@/components/design/form-builder/FormBuilderStudio";

export const designPhase: DesignPhase = {
  id: "design-phase",
  title: "Design",
  description: "Customize how your participants will experience the story collection.",
  icon: <PenTool className="h-5 w-5" />,
  steps: [
    {
      id: "form-builder",
      title: "Form Builder",
      description: "Design your narrative, slider, triangle, and participant questions with drag-and-drop",
      activities: [
        {
          id: "form-builder-canvas",
          title: "Form Builder",
          description: "Visual form builder studio",
          component: <FormBuilderStudio />,
          hideActivityContent: true
        }
      ]
    }
  ]
};
