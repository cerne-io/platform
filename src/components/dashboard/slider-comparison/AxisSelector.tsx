
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SliderQuestion } from "./useSliderQuestions";
import { debugLog } from "@/utils/debugLogger";

interface AxisSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  questions: SliderQuestion[];
}

const AxisSelector: React.FC<AxisSelectorProps> = ({ label, value, onChange, questions }) => {
  // Extract axis name (X-Axis or Y-Axis) without the "Question" part
  const axisName = label.split(" ")[0];

  // Find the selected question text
  const selectedQuestion = questions.find(q => q.id.toString() === value);

  // Make sure we have the full text to display in the select trigger
  const displayText = selectedQuestion
    ? selectedQuestion.text
    : `Select a question for ${axisName}`;

  // Truncate long question text for display in the trigger
  const truncatedDisplayText = displayText.length > 60
    ? displayText.substring(0, 57) + '...'
    : displayText;

  debugLog("AxisSelector rendering:", {
    label,
    value,
    selectedQuestion,
    displayText: truncatedDisplayText,
    availableQuestions: questions.map(q => ({ id: q.id, text: q.text.substring(0, 30) + "..." }))
  });

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <Select
        value={value}
        onValueChange={onChange}
      >
        <SelectTrigger className="min-h-10 h-auto whitespace-normal text-left">
          <SelectValue>{truncatedDisplayText}</SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[400px] overflow-y-auto">
          {questions.map((question) => (
            <SelectItem
              key={`${label}-${question.id}`}
              value={question.id.toString()}
              className="whitespace-normal text-left py-2"
            >
              {question.text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AxisSelector;
