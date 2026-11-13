
import React from "react";
import { SliderQuestion } from "./useSliderQuestions";
import AxisSelector from "./AxisSelector";
import { debugLog } from "@/utils/debugLogger";

interface FilterControlsProps {
  sliderQuestions: SliderQuestion[];
  xAxisQuestion: number | string | null;
  yAxisQuestion: number | string | null;
  onXAxisChange: (value: string) => void;
  onYAxisChange: (value: string) => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  sliderQuestions,
  xAxisQuestion,
  yAxisQuestion,
  onXAxisChange,
  onYAxisChange
}) => {
  debugLog("FilterControls rendering with:", {
    sliderQuestionsCount: sliderQuestions.length,
    sliderQuestionsSample: sliderQuestions.slice(0, 2).map(q => ({ id: q.id, text: q.text.substring(0, 30) + "..." })),
    xAxisQuestion,
    yAxisQuestion
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div className={`transition-all duration-200 ${xAxisQuestion ? "ring-2 ring-brand-primary/20 rounded-md p-1" : "p-1"}`}>
        <AxisSelector
          label="X-Axis Question"
          value={xAxisQuestion?.toString() || ""}
          onChange={onXAxisChange}
          questions={sliderQuestions}
        />
      </div>
      <div className={`transition-all duration-200 ${yAxisQuestion ? "ring-2 ring-brand-primary/20 rounded-md p-1" : "p-1"}`}>
        <AxisSelector
          label="Y-Axis Question"
          value={yAxisQuestion?.toString() || ""}
          onChange={onYAxisChange}
          questions={sliderQuestions}
        />
      </div>
    </div>
  );
};

export default FilterControls;
