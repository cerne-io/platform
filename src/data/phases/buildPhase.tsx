import React from "react";
// Removed unused import Layers
import { DesignPhase } from "../types/designTypes";
import FormAppearance from "@/components/design/form-appearance/FormAppearance";
import FormLanguages from "@/components/design/form-languages/FormLanguages";
import { Palette } from "lucide-react";


export const buildPhase: DesignPhase = {
  id: "build",
  title: "Build",
  description: "Configure languages and appearance",
  icon: <Palette className="h-5 w-5" />,
  steps: [
    {
      id: "form-languages",
      title: "Form Languages",
      description: "Manage form languages and translations",
      activities: [
        {
          id: "form-languages-editor",
          title: "Form Languages",
          description: "Select which languages are supported by your project",
          component: <FormLanguages />,
          hideActivityContent: true
        }
      ]
    },
    {
      id: "form-appearance",
      title: "Form Appearance",
      description: "Customize the look and feel of your public form",
      activities: [
        {
          id: "form-appearance-editor",
          title: "Form Appearance",
          description: "Change the colors, logo, and headings of your public form",
          component: <FormAppearance />,
          hideActivityContent: true
        }
      ]
    }
  ]
};
