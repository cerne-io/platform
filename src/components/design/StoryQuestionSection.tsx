import React from "react";
import { useProject } from "@/contexts/ProjectContext";
import { StoryQuestionProvider } from "./story-question/StoryQuestionContext";
import StoryQuestionContent from "./story-question/StoryQuestionContent";
import LocalStorageManager from "./story-question/LocalStorageManager";

interface StoryQuestionSectionProps {
  projectId?: string;
}

const StoryQuestionSection: React.FC<StoryQuestionSectionProps> = ({
  projectId: propsProjectId
}) => {
  const { activeProject } = useProject();

  // Get the project ID from props or activeProject or localStorage
  const projectId = propsProjectId ||
    (activeProject?.id || localStorage.getItem('activeProjectId') || '');





  if (!projectId) {
    return <div>No project selected</div>;
  }

  return (
    <StoryQuestionProvider projectId={projectId}>
      <LocalStorageManager />
      <StoryQuestionContent />
    </StoryQuestionProvider>
  );
};

export default StoryQuestionSection;
