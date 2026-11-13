
import React, { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ParticipantQuestion } from "@/services/types/designTypes";
import { debugLog } from "@/utils/debugLogger";
import { useTranslation } from "react-i18next";

interface ParticipantQuestionsProps {
  participantQuestions: ParticipantQuestion[];
  participantAnswers: Record<string, string>;
  onAnswerChange: (id: string, value: string) => void;
  isPublic?: boolean;
}

const ParticipantQuestions: React.FC<ParticipantQuestionsProps> = ({
  participantQuestions,
  participantAnswers,
  onAnswerChange,
  isPublic = false
}) => {
  const { t } = useTranslation('translation', { keyPrefix: 'public' });

  // Debug logging
  useEffect(() => {
    debugLog("ParticipantQuestions component rendering:", {
      questionsCount: participantQuestions?.length || 0,
      isPublic
    });
  }, [participantQuestions, participantAnswers, isPublic]);

  if (!participantQuestions || !Array.isArray(participantQuestions) || participantQuestions.length === 0) {
    return null;
  }

  return (
    <div className={`border-t pt-6 mt-8 ${isPublic ? 'border-blue-100' : ''}`}>
      <h3 className={`font-medium text-lg mb-6 ${isPublic ? 'text-blue-800 dark:text-blue-200' : 'text-foreground'}`}>
        {t('form.headers.about_you', 'Questions & Context')}
      </h3>
      <div className="space-y-8">
        {participantQuestions.map((question) => {
          const rawAnswer = participantAnswers[question.id] || "";
          const isCheckboxes =
            question.questionType === 'checkboxes' ||
            (question as unknown as { type?: string }).type === 'checkboxes';

          // Parse selected values for checkboxes
          const selectedCheckboxes: string[] = (() => {
            if (!rawAnswer) return [];
            try {
              const parsed = JSON.parse(rawAnswer);
              return Array.isArray(parsed) ? parsed : [rawAnswer];
            } catch {
              return [rawAnswer];
            }
          })();

          const choicesToRender = question.includePreferNotToSay === false
            ? (question.choices || []).filter((c) => c.id !== 'prefer-not-to-say')
            : (question.choices || []);

          return (
            <div key={question.id} className="mb-2">
              <Label
                htmlFor={`pq-${question.id}`}
                className={`mb-3 block text-base font-medium ${isPublic ? 'text-gray-800 dark:text-gray-100' : 'text-foreground'}`}
              >
                {question.label}
              </Label>

              {choicesToRender.length > 0 ? (
                isCheckboxes ? (
                  <div className="mt-3 space-y-2.5">
                    {choicesToRender.map((choice) => {
                      const isChecked = selectedCheckboxes.includes(choice.id);
                      return (
                        <div key={choice.id} className="flex items-center space-x-2.5">
                          <Checkbox
                            id={`choice-${question.id}-${choice.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const next = checked
                                ? [...selectedCheckboxes, choice.id]
                                : selectedCheckboxes.filter((id) => id !== choice.id);
                              onAnswerChange(question.id, JSON.stringify(next));
                            }}
                            className={isPublic ? 'border-blue-400 data-[state=checked]:bg-blue-600' : ''}
                          />
                          <Label
                            htmlFor={`choice-${question.id}-${choice.id}`}
                            className={`cursor-pointer font-normal text-sm ${isPublic ? 'text-gray-800 dark:text-gray-100' : 'text-foreground'}`}
                          >
                            {choice.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <RadioGroup
                    id={`pq-${question.id}`}
                    value={rawAnswer}
                    onValueChange={(value) => onAnswerChange(question.id, value)}
                    className="mt-3 space-y-2"
                  >
                    {choicesToRender.map((choice) => (
                      <div key={choice.id} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={choice.id}
                          id={`choice-${question.id}-${choice.id}`}
                          className={isPublic ? 'border-blue-400 text-blue-600' : ''}
                        />
                        <Label
                          htmlFor={`choice-${question.id}-${choice.id}`}
                          className={`cursor-pointer font-normal text-sm ${isPublic ? 'text-gray-800 dark:text-gray-100' : 'text-foreground'}`}
                        >
                          {choice.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )
              ) : (
                <Input
                  id={`pq-${question.id}`}
                  value={rawAnswer}
                  onChange={(e) => onAnswerChange(question.id, e.target.value)}
                  className={`mt-2 ${isPublic ? 'border-blue-200 focus:border-blue-400' : ''}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ParticipantQuestions;
