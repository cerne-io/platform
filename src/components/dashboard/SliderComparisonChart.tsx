
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidersHorizontal } from "lucide-react";
import { Story } from "@/types/story";
import { useSliderQuestions, useChartData, useParticipantFilters } from "./slider-comparison/useSliderQuestions";
import FilterControls from "./slider-comparison/FilterControls";

import SliderAnalysisCard from "./slider-comparison/SliderAnalysisCard";
import { InfoTooltip } from "@/components/ui/info-tooltip";

import { debugLog } from "@/utils/debugLogger";
import { useFormDataQuery } from "@/hooks/queries/useFormDataQuery";

interface SliderComparisonChartProps {
  stories: Story[];
  projectId?: string;
  isPublic?: boolean;

  isActiveProject?: boolean;
  initialContext?: import('./triangle/TriangleSelectionTypes').TriangleComparisonContext | null;
  driftNotice?: string;
}

const SliderComparisonChart: React.FC<SliderComparisonChartProps> = ({ stories, projectId, isPublic = false, isActiveProject, initialContext, driftNotice }) => {
  // Filter out transitional stories from prior project during project switch
  const currentStories = React.useMemo(() => {
    if (!projectId) return stories;
    return stories.filter(s => !s.project_id || s.project_id === projectId);
  }, [stories, projectId]);

  // Get all available slider questions directly from the stories with explicit projectId
  const sliderQuestions = useSliderQuestions(currentStories, projectId);

  // Fetch base configuration to unify multi-language labels
  const { data: formData } = useFormDataQuery(projectId, isPublic);

  // Get all available participant questions for filtering
  const participantFilters = useParticipantFilters(currentStories, formData?.participantQuestions);

  const [xAxisQuestion, setXAxisQuestion] = useState<number | string | null>(
    initialContext?.questionId || null
  );
  const [yAxisQuestion, setYAxisQuestion] = useState<number | string | null>(
    initialContext?.secondaryQuestionId || null
  );

  // Track projectId to detect project switching and reset stale axis selections
  const prevProjectIdRef = React.useRef<string | undefined>(projectId);

  React.useEffect(() => {
    if (prevProjectIdRef.current !== projectId) {
      prevProjectIdRef.current = projectId;
      // On project switch:
      if (initialContext) {
        setXAxisQuestion(initialContext.questionId || null);
        setYAxisQuestion(initialContext.secondaryQuestionId || null);
      } else {
        setXAxisQuestion(null);
        setYAxisQuestion(null);
      }
    }
  }, [projectId, initialContext]);

  // Sync state if initialContext changes from URL (rehydration)
  React.useEffect(() => {
    if (initialContext?.questionId) {
      setXAxisQuestion(initialContext.questionId);
    }
    if (initialContext?.secondaryQuestionId) {
      setYAxisQuestion(initialContext.secondaryQuestionId);
    }
  }, [initialContext]);

  // Ensure selected questions belong to the current project's available questions
  React.useEffect(() => {
    if (sliderQuestions.length === 0) {
      // If no initialContext, reset axis selections when questions are empty.
      // If initialContext is present, preserve restored axes while waiting for questions.
      if (!initialContext) {
        if (xAxisQuestion !== null) setXAxisQuestion(null);
        if (yAxisQuestion !== null) setYAxisQuestion(null);
      }
      return;
    }

    const availableIds = new Set(sliderQuestions.map(q => String(q.id)));
    const isXValid = xAxisQuestion !== null && availableIds.has(String(xAxisQuestion));
    const isYValid = yAxisQuestion !== null && availableIds.has(String(yAxisQuestion));

    // If an axis question is missing or invalid for this project, default to available questions
    if (!isXValid || !isYValid) {
      if (!isXValid) {
        if (initialContext?.questionId && availableIds.has(String(initialContext.questionId))) {
          setXAxisQuestion(initialContext.questionId);
        } else {
          setXAxisQuestion(sliderQuestions[0].id);
        }
      }

      if (!isYValid) {
        if (initialContext?.secondaryQuestionId && availableIds.has(String(initialContext.secondaryQuestionId))) {
          setYAxisQuestion(initialContext.secondaryQuestionId);
        } else {
          setYAxisQuestion(sliderQuestions.length > 1 ? sliderQuestions[1].id : sliderQuestions[0].id);
        }
      }
    }
  }, [sliderQuestions, xAxisQuestion, yAxisQuestion, initialContext]);

  // State for participant filters
  const [filters] = useState<Record<string, Set<string>>>({});

  // Get chart data and labels based on selected questions
  const { xAxisLabels, yAxisLabels, chartData } = useChartData(
    currentStories,
    xAxisQuestion,
    yAxisQuestion,
    sliderQuestions,
    filters,
    formData?.participantQuestions
  );

  // Handle axis question selection
  const handleXAxisChange = (value: string) => {
    debugLog("X-Axis changed to:", value);
    setXAxisQuestion(Number(value));
  };

  const handleYAxisChange = (value: string) => {
    debugLog("Y-Axis changed to:", value);
    setYAxisQuestion(Number(value));
  };

  const hasInsufficientQuestions = sliderQuestions.length < 2;

  debugLog("SliderComparisonChart rendering with:", {
    sliderQuestionsCount: sliderQuestions.length,
    sliderQuestionsSample: sliderQuestions.slice(0, 2).map(q => ({ id: q.id, text: q.text.substring(0, 30) + "..." })),
    xAxisQuestion,
    yAxisQuestion,
    storiesCount: stories.length
  });

  return (
    <Card className="bg-card rounded-xl border border-border/80 shadow-xs">
      <CardHeader className="bg-transparent border-b border-border/60 flex flex-row items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2">
          <CardTitle className="font-semibold text-2xl sm:text-3xl tracking-tight text-foreground">
            <SlidersHorizontal className="mr-2 h-6 w-6 inline" />
            Slider Insights
          </CardTitle>
          <InfoTooltip contentKey="dashboard-slider-comparison" size={16} />
        </div>
      </CardHeader>
      <CardContent className="bg-transparent rounded-b-md pt-6 px-4 sm:px-6">
        <FilterControls
          sliderQuestions={sliderQuestions}
          xAxisQuestion={xAxisQuestion}
          yAxisQuestion={yAxisQuestion}
          onXAxisChange={handleXAxisChange}
          onYAxisChange={handleYAxisChange}
        />

        {hasInsufficientQuestions ? (
          <div className="text-center py-8 text-gray-500 animate-fade-in">
            Not enough slider questions with responses to generate a comparison chart. You need at least two different slider questions with responses.
          </div>
        ) : (
          <SliderAnalysisCard
            stories={stories}
            xAxisQuestionId={xAxisQuestion!}
            yAxisQuestionId={yAxisQuestion!}
            xAxisLabel={xAxisLabels.text}
            yAxisLabel={yAxisLabels.text}
            chartData={chartData}
            participantFilters={participantFilters}
            projectId={projectId}
            isPublic={isPublic}

            isActiveProject={isActiveProject}
            initialContext={initialContext || undefined}
            driftNotice={driftNotice}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default SliderComparisonChart;
