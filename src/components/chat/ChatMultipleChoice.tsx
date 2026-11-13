import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Check, SkipForward } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ChatMultipleChoiceProps {
  questionId: string;
  question: string;
  choices: Array<{ id: string; label: string }>;
  questionType?: 'multiple-choice' | 'checkboxes';
  onSubmit: (questionId: string, choiceId: string) => void;
  onSkip: (questionId: string) => void;
  disabled?: boolean;
}

const ChatMultipleChoice: React.FC<ChatMultipleChoiceProps> = ({
  questionId,
  question,
  choices,
  questionType = 'multiple-choice',
  onSubmit,
  onSkip,
  disabled = false
}) => {
  const { t } = useTranslation('translation', { keyPrefix: 'public.button' });
  const [selectedChoice, setSelectedChoice] = useState<string>("");
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);

  const isCheckboxes = questionType === 'checkboxes';

  const toggleCheckbox = (id: string) => {
    if (disabled) return;
    setSelectedChoices((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (isCheckboxes) {
      if (selectedChoices.length > 0) {
        onSubmit(questionId, JSON.stringify(selectedChoices));
      }
    } else {
      if (selectedChoice) {
        onSubmit(questionId, selectedChoice);
      }
    }
  };

  const handleSkip = () => {
    onSkip(questionId);
  };

  const isSubmitDisabled = disabled || (isCheckboxes ? selectedChoices.length === 0 : !selectedChoice);

  return (
    <div className="space-y-4 p-4 bg-card rounded-xl border border-border/80 shadow-xs">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground leading-snug [text-wrap:pretty]">{question}</p>

        {isCheckboxes ? (
          <div className="space-y-2">
            {choices.map((choice) => {
              const isChecked = selectedChoices.includes(choice.id);
              const inputId = `choice-${questionId}-${choice.id}`;
              return (
                <Label
                  key={choice.id}
                  htmlFor={inputId}
                  className={`flex items-center space-x-2.5 p-2 rounded-lg border transition-all duration-150 cursor-pointer select-none font-normal ${
                    isChecked
                      ? 'border-primary/50 bg-primary/[0.04]'
                      : 'border-border/50 hover:bg-muted/40'
                  }`}
                >
                  <Checkbox
                    id={inputId}
                    checked={isChecked}
                    onCheckedChange={() => toggleCheckbox(choice.id)}
                    disabled={disabled}
                    className="cursor-pointer"
                  />
                  <span className="cursor-pointer text-xs font-medium text-foreground/90 flex-1">
                    {choice.label}
                  </span>
                </Label>
              );
            })}
          </div>
        ) : (
          <RadioGroup
            value={selectedChoice}
            onValueChange={setSelectedChoice}
            disabled={disabled}
            className="space-y-2"
          >
            {choices.map((choice) => {
              const isSelected = selectedChoice === choice.id;
              const inputId = `choice-${questionId}-${choice.id}`;
              return (
                <Label
                  key={choice.id}
                  htmlFor={inputId}
                  className={`flex items-center space-x-2.5 p-2 rounded-lg border transition-all duration-150 cursor-pointer select-none font-normal ${
                    isSelected
                      ? 'border-primary/50 bg-primary/[0.04]'
                      : 'border-border/50 hover:bg-muted/40'
                  }`}
                >
                  <RadioGroupItem
                    value={choice.id}
                    id={inputId}
                    className="cursor-pointer"
                  />
                  <span className="cursor-pointer text-xs font-medium text-foreground/90 flex-1">
                    {choice.label}
                  </span>
                </Label>
              );
            })}
          </RadioGroup>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkip}
            disabled={disabled}
            className="active:scale-[0.98] transition-transform duration-150"
          >
            <SkipForward className="h-3 w-3 mr-1" />
            {t('skip')}
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="active:scale-[0.98] transition-transform duration-150 shadow-xs"
          >
            <Check className="h-3 w-3 mr-1" />
            {t('submit_response')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatMultipleChoice;
