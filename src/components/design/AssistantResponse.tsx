
import React from "react";
import ResponseContainer from "./assistantResponse/ResponseContainer";
import { QuestionImprover } from "./improver/QuestionImprover";
import { debugLog } from "@/utils/debugLogger";

interface AssistantResponseProps {
  response: string;
  mode: 'general' | 'storyQuestion';
  onSaveQuestion?: (question: string | Record<string, string>) => Promise<void>;
  onAcceptImprovement?: (question: string | Record<string, string>, savedToDb?: boolean) => void;
  currentQuestion?: string | Record<string, string> | null;
  forceEditMode?: boolean;
  onCancelEdit?: () => void;
  onChange?: (question: string) => void;
}

const AssistantResponse: React.FC<AssistantResponseProps> = ({
  response,
  mode,
  onSaveQuestion,
  onAcceptImprovement,
  currentQuestion,
  forceEditMode,
  onCancelEdit,
  onChange
}) => {
  debugLog("AssistantResponse rendering with:", {
    responseLength: response.length,
    mode,
    hasCurrentQuestion: !!currentQuestion,
    responsePreview: response.substring(0, 50) + "..."
  });

  // Wrap onSaveQuestion to ensure it always returns a Promise
  const handleSaveQuestion = async (question: string | Record<string, string>): Promise<void> => {
    if (onSaveQuestion) {
      return onSaveQuestion(question);
    }
    return Promise.resolve();
  };

  // Extract string for components that only support strings (like QuestionImprover)
  const questionString = typeof currentQuestion === 'string' 
    ? currentQuestion 
    : (currentQuestion && typeof currentQuestion === 'object' 
        ? (currentQuestion['en'] || Object.values(currentQuestion)[0] || "") 
        : "");

  return (
    <div className="space-y-6">
      <ResponseContainer
        response={response}
        mode={mode}
        onSaveQuestion={handleSaveQuestion}
        currentQuestion={currentQuestion}
        forceEditMode={forceEditMode}
        onCancelEdit={onCancelEdit}
        onChange={onChange}
      />

      {mode === 'storyQuestion' && (
        <QuestionImprover
          initialQuestion={questionString || response}
          onAcceptImprovement={onAcceptImprovement || (() => { })}
        />
      )}
    </div>
  );
};

export default AssistantResponse;
