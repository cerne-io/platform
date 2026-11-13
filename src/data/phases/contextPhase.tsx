
import React from "react";
import { BookOpen } from "lucide-react";
import { DesignPhase } from "../types/designTypes";

export const contextPhase: DesignPhase = {
  id: "context",
  title: "Context",
  description: "Define the context, needs and hopes",
  icon: <BookOpen className="h-5 w-5" />,
  steps: [
    {
      id: "organization",
      title: "Organization",
      description: "Context about your organization",
      activities: [
        {
          id: "about",
          title: "About",
          description: "Talk about your organization. What is it for? What does it do? For whom? How is it positioned?"
        },
        {
          id: "history",
          title: "History",
          description: "What has happened in the organization's past that is relevant for this project?"
        },
        {
          id: "values",
          title: "Values",
          description: "What is known about what the organization values (explicitly and implicitly)?"
        }
      ]
    },
    {
      id: "project",
      title: "Project",
      description: "Define the project scope and need",
      activities: [
        {
          id: "scope",
          title: "Scope",
          description: "Talk specifically about the project. What is it about? What is it trying to solve?"
        },
        {
          id: "trigger",
          title: "Trigger",
          description: "What triggered the need for the project at this time?"
        },
        {
          id: "success",
          title: "Success",
          description: "What are you hoping to achieve? What does success look like?"
        }
      ]
    }
  ]
};
