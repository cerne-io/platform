
import React from "react";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

interface QuestionSaveActionsProps {
  mode: 'general' | 'storyQuestion';
  questionSaved: boolean;
  isEditMode: boolean;
  displayQuestion: string;
  onSave: (question: string) => void;
}

const QuestionSaveActions: React.FC<QuestionSaveActionsProps> = ({
  mode,
  questionSaved,
  isEditMode,
  displayQuestion,
  onSave
}) => {
  // Only show save button for story questions that aren't saved yet, aren't in edit mode, and have content
  if (mode !== 'storyQuestion' || questionSaved || isEditMode || !displayQuestion) {
    return null;
  }

  return (
    <div className="flex justify-end">
      <Button
        onClick={() => onSave(displayQuestion)}
        className="px-4 py-2 bg-cerne-600 text-white rounded-md hover:bg-cerne-700 transition-colors flex items-center gap-2"
      >
        <Save className="h-4 w-4" />
        Save as Permanent Question
      </Button>
    </div>
  );
};

export default QuestionSaveActions;
