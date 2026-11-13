
import { useState, useEffect } from "react";
import { STORAGE_KEYS } from "@/services/constants/storageKeys";

export const useStoryQuestionState = (projectId: string) => {
  const [savedQuestion, setSavedQuestion] = useState<string | Record<string, string> | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasEverSavedQuestion, setHasEverSavedQuestion] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Check localStorage for the saved question flag on initial render
  useEffect(() => {
    if (projectId) {
      const hasQuestionBeenSaved = localStorage.getItem(STORAGE_KEYS.STORY_QUESTION_SAVED(projectId));
      if (hasQuestionBeenSaved === 'true') {
        setHasEverSavedQuestion(true);
      }
    }
  }, [projectId]);

  return {
    savedQuestion,
    setSavedQuestion,
    currentQuestion,
    setCurrentQuestion,
    isLoading,
    setIsLoading,
    hasEverSavedQuestion,
    setHasEverSavedQuestion,
    isEditing,
    setIsEditing
  };
};
