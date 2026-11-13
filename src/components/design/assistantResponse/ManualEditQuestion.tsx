
import React, { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";

interface ManualEditQuestionProps {
  question: string;
  onSave: (question: string) => void;
  onCancel?: () => void;
  onChange?: (question: string) => void;
}

const ManualEditQuestion: React.FC<ManualEditQuestionProps> = ({
  question,
  onSave,
  onCancel,
  onChange
}) => {
  const [editedQuestion, setEditedQuestion] = useState(question);

  // Sync edited question when prop changes (essential for multi-language switching)
  useEffect(() => {
    setEditedQuestion(question);
  }, [question]);

  const handleSave = () => {
    if (editedQuestion.trim()) {
      onSave(editedQuestion.trim());
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={editedQuestion}
        onChange={(e) => {
          const newVal = e.target.value;
          setEditedQuestion(newVal);
          if (onChange) onChange(newVal);
        }}
        className="min-h-[100px] w-full text-black dark:text-gray-100 bg-white dark:bg-[#0d1117] border-gray-300 dark:border-white/10 focus:border-primary focus:ring-primary/20"
        placeholder="Edit the story question..."
      />

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex items-center gap-1 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        )}

        <Button
          type="button"
          onClick={handleSave}
          className="bg-primary hover:bg-primary/90 text-primary-foreground dark:text-white flex items-center gap-1"
        >
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  );
};

export default ManualEditQuestion;
