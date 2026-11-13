
import { useState, useCallback } from 'react';

/**
 * Hook to manage participant answers to form questions
 */
export const useParticipantAnswers = (setParticipantAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>) => {
  const [participantValues, setParticipantValues] = useState<Record<string, string>>({});

  // Update a single participant value
  const updateParticipantValue = useCallback(
    (questionId: string | number, value: string) => {
      setParticipantValues((prev) => ({
        ...prev,
        [questionId]: value,
      }));
    },
    []
  );

  // Handle participant answer change
  const handleParticipantAnswerChange = useCallback(
    (questionId: string | number, value: string) => {
      const id = String(questionId);
      setParticipantAnswers((prev) => ({
        ...prev,
        [id]: value,
      }));
    },
    [setParticipantAnswers]
  );

  // Reset all participant answers
  const resetParticipantAnswers = useCallback(() => {
    setParticipantValues({});
  }, []);

  return {
    participantValues,
    updateParticipantValue,
    handleParticipantAnswerChange,
    resetParticipantAnswers,
  };
};
