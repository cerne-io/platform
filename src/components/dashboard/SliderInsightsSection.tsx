
import React, { useState, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidersHorizontal } from "lucide-react";
import { useSliderInsights } from "./slider-insights/hooks/useSliderInsights";
import { prepareHistogramData } from "./slider-insights/histogramUtils";
import QuestionSelectorGrid from "./slider-insights/QuestionSelectorGrid";
import NoQuestionsMessage from "./slider-insights/NoQuestionsMessage";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { SectionLoader } from "@/components/ui/SectionLoader";
import { useFormDataQuery } from "@/hooks/queries/useFormDataQuery";

import { Story } from "@/types/story";

const DistributionHistogram = lazy(() => import("./slider-insights/DistributionHistogram"));
const FilterSection = lazy(() => import("./slider-insights/FilterSection"));

interface SliderInsightsSectionProps {
  stories: Story[];
  isLoading: boolean;
  isPublic?: boolean;
  projectId?: string;
}

const SliderInsightsSection: React.FC<SliderInsightsSectionProps> = ({
  stories,
  isLoading,
  isPublic = false,
  projectId,
}) => {
  // State to track whether to color by emotions
  const [colorByEmotions, setColorByEmotions] = useState<boolean>(false);
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});

  // Form data for unified multi-language labels
  const { data: formData } = useFormDataQuery(projectId, isPublic);

  // Use our custom hook to get all the slider data
  const {
    questionList,
    selectedQuestion,
    selectedQuestionId,
    setSelectedQuestionId,
    processedStories,
    isProcessing,
    processingComplete,
    participantFilters,
    loading: questionsLoading
  } = useSliderInsights(stories, colorByEmotions, formData?.participantQuestions, projectId, isPublic);

  // Prepare histogram data for the selected question
  const histogramData = selectedQuestion
    ? prepareHistogramData(selectedQuestion, processedStories, filters, stories, formData?.participantQuestions)
    : [];

  if (isLoading) {
    return null;
  }

  return (
    <Card className="col-span-1 lg:col-span-2 bg-card rounded-xl border border-border/80 shadow-xs">
      <CardHeader className="bg-transparent border-b border-border/60 flex flex-row items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2">
          <CardTitle className="font-semibold text-2xl sm:text-3xl tracking-tight text-foreground">
            <SlidersHorizontal className="mr-2 h-6 w-6 inline" />
            Slider Responses
          </CardTitle>
          <InfoTooltip contentKey="dashboard-slider-responses" size={16} />
        </div>
      </CardHeader>
      <CardContent className="bg-transparent rounded-b-md pt-6 px-4 sm:px-6">
        {questionList.length === 0 && !questionsLoading ? (
          <NoQuestionsMessage />
        ) : (
          <div className="space-y-6 animate-fade-in">
            <QuestionSelectorGrid
              questionList={questionList}
              selectedQuestionId={selectedQuestionId}
              setSelectedQuestionId={setSelectedQuestionId}
              loading={questionsLoading}
            />

            {selectedQuestion && (
              <Suspense fallback={<SectionLoader />}>
                <DistributionHistogram
                  histogramData={histogramData}
                  leftLabel={selectedQuestion.left_label}
                  rightLabel={selectedQuestion.right_label}
                  questionText={selectedQuestion.question_text}
                  colorByEmotions={colorByEmotions}
                />
              </Suspense>
            )}

            {selectedQuestion && (
              <Suspense fallback={<SectionLoader height="h-32" />}>
                <FilterSection
                  colorByEmotions={colorByEmotions}
                  setColorByEmotions={setColorByEmotions}
                  isProcessing={isProcessing}
                  processingComplete={processingComplete}
                  participantFilters={participantFilters}
                  filters={filters}
                  setFilters={setFilters}
                />
              </Suspense>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SliderInsightsSection;
