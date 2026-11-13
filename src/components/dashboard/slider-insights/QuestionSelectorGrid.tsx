
import React from "react";
import { SliderQuestion } from "./histogramUtils";
import QuestionSelectorCard from "./QuestionSelectorCard";
import { Skeleton } from "@/components/ui/skeleton";

interface QuestionSelectorGridProps {
  questionList: SliderQuestion[];
  selectedQuestionId: number | string | null;
  setSelectedQuestionId: (id: number | string) => void;
  loading?: boolean;
}

const QuestionSelectorGrid: React.FC<QuestionSelectorGridProps> = ({
  questionList,
  selectedQuestionId,
  setSelectedQuestionId,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Select a question to view:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (questionList.length <= 1) {
    return selectedQuestionId ? null : (
      <div className="mb-4 text-sm text-gray-500">
        Only one question available. Showing results below.
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium mb-3">Select a question to view:</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {questionList.map((question) => (
          <QuestionSelectorCard
            key={question.id}
            questionText={question.question_text}
            average={question.average}
            responsesCount={question.responses.length}
            leftLabel={question.left_label}
            rightLabel={question.right_label}
            isSelected={selectedQuestionId === question.id}
            onClick={() => setSelectedQuestionId(question.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default QuestionSelectorGrid;
