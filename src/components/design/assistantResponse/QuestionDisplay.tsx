import { debugError } from "@/utils/debugLogger";
import React, { useEffect } from "react";

import ManualEditQuestion from "./ManualEditQuestion";
import { Pencil } from "lucide-react";
import { debugLog } from "@/utils/debugLogger";
import { STORAGE_KEYS } from "@/services/constants/storageKeys";
import { useOptionalProject } from "@/contexts/ProjectContext";

interface QuestionDisplayProps {
  question: string;
  mode: 'general' | 'storyQuestion';
  onSave?: (question: string) => void;
  saved?: boolean;
  isEditMode?: boolean;
  onEditClick?: () => void;
  onCancelEdit?: () => void;
  onChange?: (question: string) => void;
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  mode,
  onSave,
  saved = false,
  isEditMode = false,
  onEditClick,
  onCancelEdit,
  onChange
}) => {
  // Debug log to help with troubleshooting
  useEffect(() => {
    debugLog("QuestionDisplay rendering:", {
      questionLength: question?.length,
      questionPreview: question?.substring(0, 50),
      mode,
      saved,
      isEditMode
    });
  }, [question, mode, saved, isEditMode]);

  const projectId = useOptionalProject()?.activeProject?.id;

  // Save to localStorage for backup purposes
  useEffect(() => {
    if (question && mode === 'storyQuestion' && saved && projectId) {
      try {
        localStorage.setItem(STORAGE_KEYS.STORY_QUESTION_CONTENT(projectId), question);
        localStorage.setItem(STORAGE_KEYS.STORY_QUESTION_SAVED(projectId), 'true');
      } catch (error) {
        debugError("Error saving story question to localStorage:", error);
      }
    }
  }, [question, mode, saved, projectId]);

  if (!question && !isEditMode) {
    return null;
  }

  return (
    <div className="relative">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {mode === 'storyQuestion' ? 'Story Question:' : 'Assistant Response:'}
          </p>
          {saved && mode === 'storyQuestion' && (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-xs font-medium">Saved</span>
            </div>
          )}
        </div>

        {mode === 'storyQuestion' && onEditClick && !isEditMode && (
          <button
            onClick={onEditClick}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20 dark:hover:text-white"
          >
            <Pencil size={12} />
            Edit
          </button>
        )}
      </div>

      {isEditMode && onSave ? (
        <ManualEditQuestion
          question={question}
          onSave={onSave}
          onCancel={onCancelEdit}
          onChange={onChange}
        />
      ) : (
        <div className="relative">
          <div className="text-base text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-regular leading-relaxed">
            {question}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionDisplay;
