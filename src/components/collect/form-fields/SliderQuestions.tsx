
import React, { useEffect } from "react";
import { SliderQuestion } from "@/services/types/designTypes";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { debugLog } from "@/utils/debugLogger";

interface SliderQuestionsProps {
  questions: SliderQuestion[];
  sliderValues: Record<number | string, number | null | "n/a">;
  onSliderChange: (id: number | string, value: number[] | "n/a") => void;
  touchedSliders: Set<number>;
  setTouchedSliders: (updatedSet: Set<number>) => void;
  isPublic?: boolean;
}

import { useTranslation } from "react-i18next";

const SliderQuestions: React.FC<SliderQuestionsProps> = ({
  questions,
  sliderValues,
  onSliderChange,
  touchedSliders,
  setTouchedSliders,
  isPublic = false
}) => {
  const { t } = useTranslation('translation', { keyPrefix: 'public' });
  // Log questions received to debug
  useEffect(() => {
    debugLog("SliderQuestions component received:", {
      questionsCount: questions?.length || 0,
      questions: questions?.map(q => ({ id: q.id, question: q.question })),
      sliderValues,
      isPublic
    });
  }, [questions, sliderValues, isPublic]);

  const handleSliderInteraction = (id: number, value: number[]) => {
    // Mark slider as touched
    const updatedTouched = new Set(touchedSliders);
    updatedTouched.add(id);
    setTouchedSliders(updatedTouched);

    // Update value
    onSliderChange(id, value);
  };

  const resetSlider = (id: number) => {
    onSliderChange(id, "n/a");
  };

  if (!questions || questions.length === 0) {
    debugLog("SliderQuestions: No questions available to render");
    return null;
  }

  return (
    <div className={`border-t pt-6 mt-8 ${isPublic ? 'border-blue-100' : ''}`}>
      <h3 className={`font-medium text-lg mb-6 ${isPublic ? 'text-blue-800 dark:text-blue-200' : 'text-foreground'}`}>
        {t('form.headers.about_experience')}
      </h3>

      <div className="space-y-8">
        {questions.map((question) => {
          const currentValue = sliderValues[question.id];
          const isNa = currentValue === "n/a";

          // Parse slider value correctly
          let displayValue: number[];

          if (isNa) {
            displayValue = [50]; // Default for N/A
          } else if (typeof currentValue === 'number') {
            displayValue = [currentValue];
          } else {
            displayValue = [50]; // Default fallback
          }

          return (
            <div key={question.id} className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <Label
                  htmlFor={`slider-${question.id}`}
                  className={`text-base font-medium ${isPublic ? 'text-gray-800 dark:text-gray-100' : 'text-foreground'}`}
                >
                  {question.question}
                </Label>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => resetSlider(question.id)}
                  className={`text-xs h-6 px-2 ${isNa ? 'border-primary text-primary bg-primary/10' : 'text-muted-foreground border-border hover:bg-muted'}`}
                >
                  N/A
                </Button>
              </div>

              <div className="pt-2 pb-6">
                <Slider
                  id={`slider-${question.id}`}
                  defaultValue={[50]}
                  max={100}
                  step={1}
                  value={displayValue}
                  onValueChange={(val) => handleSliderInteraction(question.id, val)}
                  className={isNa ? "opacity-50" : ""}
                />

                <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                  <span>{question.leftLabel}</span>
                  <span>{question.rightLabel}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SliderQuestions;
