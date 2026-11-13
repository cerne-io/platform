
import { useState, useEffect } from "react";
import { getStoryQuestion, saveStoryQuestion } from "@/services/storyQuestionService";
import { debugLog, debugError } from "@/utils/debugLogger";

export const useStoryQuestion = (projectId: string) => {
  const [savedQuestion, setSavedQuestion] = useState<string | Record<string, string> | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [hasEverSavedQuestion, setHasEverSavedQuestion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    debugLog("useStoryQuestion hook called with projectId:", projectId);
    const fetchStoryQuestion = async () => {
      if (!projectId) {
        debugLog("No projectId provided to useStoryQuestion, skipping fetch");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        debugLog("Fetching story question for project:", projectId);
        const question = await getStoryQuestion(projectId);

        debugLog("Story question fetch result:", question);
        setSavedQuestion(question);
        setCurrentQuestion(question);
        setHasEverSavedQuestion(!!question);

      } catch (err) {
        debugError("Error fetching story question:", err);
        setError("Failed to load the story question");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchStoryQuestion();
  }, [projectId]);

  const handleSaveQuestion = async (question: string | Record<string, string>): Promise<boolean> => {
    if (!projectId) {
      debugError("Cannot save question: No project ID provided");
      return false;
    }

    try {
      debugLog("Saving story question for project:", projectId);
      saveStoryQuestion(question, projectId);

      // Update state after successful save
      setSavedQuestion(question);
      setCurrentQuestion(question);
      setHasEverSavedQuestion(true);

      return true;
    } catch (err) {
      debugError("Error saving story question:", err);
      return false;
    }
  };

  return {
    savedQuestion,
    currentQuestion,
    isLoading,
    isEditing,
    hasEverSavedQuestion,
    error,
    setIsEditing,
    handleSaveQuestion
  };
};
