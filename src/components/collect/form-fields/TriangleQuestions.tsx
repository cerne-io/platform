
import React, { useEffect } from "react";
import { TriangleQuestion } from "@/services/types/designTypes";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import TrianglePicker from "./TrianglePicker";
import { DEFAULT_TRIANGLE_POSITION } from "./trianglePickerConstants";
import { debugLog } from "@/utils/debugLogger";

import { useTranslation } from "react-i18next";

interface TriangleQuestionsProps {
  questions: TriangleQuestion[];
  triangleValues: Record<number | string, { x: number; y: number } | "n/a">;
  onTriangleChange: (id: number | string, x: number | "n/a", y?: number) => void;
  touchedTriangles: Set<number>;
  setTouchedTriangles: (updatedSet: Set<number>) => void;
  isPublic?: boolean;
}

const TriangleQuestions: React.FC<TriangleQuestionsProps> = ({
  questions,
  triangleValues,
  onTriangleChange,
  touchedTriangles,
  setTouchedTriangles,
  isPublic = false
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "public" });

  useEffect(() => {
    debugLog("TriangleQuestions component received:", {
      questionsCount: questions?.length || 0,
      questions: questions?.map(q => ({ id: q.id, question: q.question })),
      triangleValues,
      isPublic
    });
  }, [questions, triangleValues, isPublic]);

  const handleTriangleInteraction = (id: number, x: number, y: number) => {
    const updatedTouched = new Set(touchedTriangles);
    updatedTouched.add(id);
    setTouchedTriangles(updatedTouched);

    onTriangleChange(id, x, y);
  };

  const resetTriangle = (id: number) => {
    onTriangleChange(id, "n/a");
  };

  if (!questions || questions.length === 0) {
    debugLog("TriangleQuestions: No questions available to render");
    return null;
  }

  return (
    <div className={`border-t pt-6 mt-8 ${isPublic ? 'border-blue-100' : ''}`}>
      <h3 className={`font-medium text-lg mb-6 ${isPublic ? 'text-blue-800 dark:text-blue-200' : 'text-foreground'}`}>
        {t('form.headers.positioning_questions')}
      </h3>

      <div className="space-y-12">
        {questions.map((question) => {
          const currentValue = triangleValues[question.id];
          const isNa = currentValue === "n/a";

          // Parse position value correctly
          let position: { x: number; y: number };

          if (isNa) {
            position = DEFAULT_TRIANGLE_POSITION; // Default center for N/A
          } else if (currentValue && typeof currentValue === 'object') {
            position = currentValue;
          } else {
            position = {
              x: question.defaultX ?? DEFAULT_TRIANGLE_POSITION.x,
              y: question.defaultY ?? DEFAULT_TRIANGLE_POSITION.y
            };
          }

          return (
            <div key={question.id} className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <Label
                  htmlFor={`triangle-${question.id}`}
                  className={`text-base font-medium ${isPublic ? 'text-gray-800 dark:text-gray-100' : 'text-foreground'}`}
                >
                  {question.question}
                </Label>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => resetTriangle(question.id)}
                  className={`text-xs h-6 px-2 ${isNa ? 'border-primary text-primary bg-primary/10' : 'text-muted-foreground border-border hover:bg-muted'}`}
                >
                  N/A
                </Button>
              </div>

              <div className={`pt-2 transition-opacity duration-200 ${isNa ? 'opacity-50' : 'opacity-100'}`}>
                <TrianglePicker
                  topLabel={question.topLabel}
                  bottomLeftLabel={question.bottomLeftLabel}
                  bottomRightLabel={question.bottomRightLabel}
                  position={position}
                  onChange={(x, y) => handleTriangleInteraction(question.id, x, y)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TriangleQuestions;
