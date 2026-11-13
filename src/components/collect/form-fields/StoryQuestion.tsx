
import React from "react";
import { useForm } from "@/contexts/form";
import StoryInputMethod from "./StoryInputMethod";

interface StoryQuestionProps {
  isPublic?: boolean;
}

const StoryQuestion: React.FC<StoryQuestionProps> = ({ isPublic = false }) => {
  const { storyQuestion, storyText, setStoryText } = useForm();

  return (
    <StoryInputMethod
      storyQuestion={storyQuestion || null}
      storyText={storyText}
      onChange={setStoryText}
      isPublic={isPublic}
    />
  );
};

export default StoryQuestion;
