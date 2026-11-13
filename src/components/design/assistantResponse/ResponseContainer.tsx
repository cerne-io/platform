import { debugError } from "@/utils/debugLogger";
import React, { useState, useEffect } from "react";
import QuestionDisplay from "./QuestionDisplay";
import QuestionSaveActions from "./QuestionSaveActions";
import { useResponseProcessing } from "./hooks/useResponseProcessing";

import { useErrorHandler } from "@/utils/errorHandling";
import { clearFormDataCache } from "@/services/cache/formDataCache";
import { debugLog } from "@/utils/debugLogger";
import { STORAGE_KEYS } from "@/services/constants/storageKeys";
import { useOptionalProject } from "@/contexts/ProjectContext";

interface ResponseContainerProps {
  response: string;
  mode: 'general' | 'storyQuestion';
  onSaveQuestion?: (question: string | Record<string, string>) => Promise<void>;
  currentQuestion?: string | Record<string, string> | null;
  forceEditMode?: boolean;
  onCancelEdit?: () => void;
  onChange?: (question: string) => void;
}

const ResponseContainer: React.FC<ResponseContainerProps> = ({
  response,
  mode,
  onSaveQuestion,
  currentQuestion,
  forceEditMode,
  onCancelEdit,
  onChange
}) => {
  const [isEditMode, setIsEditMode] = useState(forceEditMode || false);
  const { wrapHandler } = useErrorHandler("ResponseContainer");
  const projectId = useOptionalProject()?.activeProject?.id;

  // Update edit mode if forceEditMode changes
  useEffect(() => {
    if (forceEditMode) {
      setIsEditMode(true);
    }
  }, [forceEditMode]);

  // Use the extracted hook for response processing
  const {
    displayQuestion,
    setDisplayQuestion,
    questionSaved,
    setQuestionSaved
  } = useResponseProcessing(response, currentQuestion);

  // Ensure localStorage backup
  useEffect(() => {
    if (displayQuestion && mode === 'storyQuestion' && projectId) {
      try {
        // Save the current display question as a backup for the container itself
        localStorage.setItem(STORAGE_KEYS.RESPONSE_CONTAINER_DISPLAY_QUESTION(projectId), displayQuestion);
        
        // NOTE: We no longer manually update STORY_QUESTION_CONTENT or STORY_QUESTION_SAVED here
        // as those are managed more robustly by the specialized storyQuestionSyncService 
        // to prevent single-language strings from overwriting multi-language translation objects.
      } catch (error) {
        debugError("Error saving display question to localStorage:", error);
      }
    }
  }, [displayQuestion, questionSaved, mode, projectId]);

  const handleSaveManualEdit = wrapHandler(async (editedQuestion: string) => {
    debugLog("[ResponseContainer] Saving manual edit:", editedQuestion);
    setDisplayQuestion(editedQuestion);
    setIsEditMode(false);

    // Clear form cache before saving
    try {
      if (projectId) {
        clearFormDataCache(projectId, 'form_data');
      }
    } catch (error) {
      debugError("Error clearing form cache:", error);
    }

    // Always save manual edits to the database as the permanent question
    if (onSaveQuestion) {
      debugLog("[ResponseContainer] Saving question via onSaveQuestion callback:", editedQuestion);
      await onSaveQuestion(editedQuestion);
      setQuestionSaved(true);

      // NOTE: STORY_QUESTION_CONTENT updating is now handled by the parent/sync-service 
      // when they call the actual database save operations.
    }
  });

  const handleEditClick = () => {
    debugLog("[ResponseContainer] Edit mode activated");
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    debugLog("[ResponseContainer] Edit cancelled");
    setIsEditMode(false);
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  // Better handling for empty questions
  if (!displayQuestion && !response && !forceEditMode && !isEditMode) {
    debugLog("[ResponseContainer] No question to display, rendering empty state");
    return null;
  }

  debugLog("[ResponseContainer] Render state:", {
    displayQuestion,
    questionSaved,
    isEditMode,
    response,
    currentQuestion
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="bg-white dark:bg-[#161B22] p-4 rounded-lg border border-gray-200 dark:border-white/10">
        <QuestionDisplay
          question={displayQuestion || response}
          mode={mode}
          onSave={mode === 'storyQuestion' ? handleSaveManualEdit : undefined}
          saved={questionSaved}
          isEditMode={isEditMode}
          onEditClick={handleEditClick}
          onCancelEdit={handleCancelEdit}
          onChange={onChange}
        />
      </div>

      <QuestionSaveActions
        mode={mode}
        questionSaved={questionSaved}
        isEditMode={isEditMode}
        displayQuestion={displayQuestion}
        onSave={wrapHandler(async (question: string) => {
          // Ensure we're using the correct handler for saving
          await handleSaveManualEdit(question);
        })}
      />
    </div>
  );
};

export default ResponseContainer;
