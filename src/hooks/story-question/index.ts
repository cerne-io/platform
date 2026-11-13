
import { useStoryQuestionState } from './useStoryQuestionState';
import { useStoryQuestionFetching } from './useStoryQuestionFetching';
import { useStoryQuestionActions } from './useStoryQuestionActions';
import { useState } from 'react';

export const useStoryQuestion = (projectId: string) => {
  // Initialize an error state
  const [error, setError] = useState<string | null>(null);
  
  // Initialize the state
  const {
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
  } = useStoryQuestionState(projectId);

  // Set up data fetching
  useStoryQuestionFetching({
    projectId,
    setSavedQuestion,
    setCurrentQuestion,
    setIsLoading,
    setHasEverSavedQuestion,
    setError
  });

  // Set up actions (save, edit)
  const { handleSaveQuestion, handleEditQuestion } = useStoryQuestionActions({
    projectId,
    savedQuestion,
    setSavedQuestion,
    setCurrentQuestion,
    setIsEditing,
    setHasEverSavedQuestion,
    setError
  });

  return {
    // State
    savedQuestion,
    currentQuestion,
    isLoading,
    isEditing,
    hasEverSavedQuestion,
    error,
    
    // Setters
    setIsEditing,
    setSavedQuestion,
    setCurrentQuestion,
    setError,
    
    // Actions
    handleSaveQuestion,
    handleEditQuestion
  };
};
