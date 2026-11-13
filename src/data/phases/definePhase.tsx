
import React from "react";
import { Target } from "lucide-react";
import { DesignPhase } from "../types/designTypes";

export const definePhase: DesignPhase = {
  id: "define",
  title: "Define",
  description: "Define the topic, focus and factors",
  icon: <Target className="h-5 w-5" />,
  tooltipKey: "design-define-phase",
  steps: [
    {
      id: "topic",
      title: "Topic",
      description: "Define the topic and focus",
      activities: [
        {
          id: "investigate",
          title: "Investigate",
          description: "What topic are you investigating?"
        },
        {
          id: "focus",
          title: "Focus",
          description: "What is the focus? What is it specifically about?"
        },
        {
          id: "actors",
          title: "Actors",
          description: "Who are the actors that you want to hear from?"
        }
      ]
    },
    {
      id: "discover",
      title: "Discover",
      description: "Define hopes and factors",
      activities: [
        {
          id: "hopes",
          title: "Hopes",
          description: "What is that you hope to discover at the end?"
        },
        {
          id: "experiences",
          title: "Experiences",
          description: "What kind of experiences would people have that most likely reveal the current state of the topic?"
        },
        {
          id: "factors",
          title: "Factors",
          description: "What factors do you believe influence how people behave or decide around this topic?"
        }
      ]
    }
  ]
};
