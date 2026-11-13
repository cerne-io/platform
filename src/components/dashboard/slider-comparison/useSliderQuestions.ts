import { useMemo } from "react";
import { Story } from "@/types/story";
import { useSliderQuestionsQuery } from "@/hooks/queries/useSliderQuestionsQuery";
import { SliderQuestion } from "./types";
import { ParticipantQuestion } from "@/services/types/designTypes";
import { calculateParticipantFilters, calculateChartData } from "./sliderUtils";
import { useOptionalProject } from "@/contexts/ProjectContext";

// Re-export types for backward compatibility
export type { SliderQuestion, ParticipantFilter } from "./types";

export const useSliderQuestions = (stories: Story[], projectIdProp?: string) => {
  const contextProjectId = useOptionalProject()?.activeProject?.id;
  const projectId = projectIdProp || contextProjectId;

  // Extract all unique slider questions from the stories initially
  const initialSliderQuestions = useMemo(() => {
    const questions = new Map<number | string, SliderQuestion>();

    const storiesLen = stories.length;
    for (let i = 0; i < storiesLen; i++) {
      const story = stories[i];
      // Guard against transitional stories from a previous project during project switch
      if (projectId && story.project_id && story.project_id !== projectId) {
        continue;
      }

      if (story.sliderResponses) {
        const responsesLen = story.sliderResponses.length;
        for (let j = 0; j < responsesLen; j++) {
          const response = story.sliderResponses[j];
          if (!questions.has(response.question_id)) {
            questions.set(response.question_id, {
              id: response.question_id,
              text: response.question_text,
              left_label: response.left_label || "Low",
              right_label: response.right_label || "High"
            });
          }
        }
      }
    }

    return Array.from(questions.values());
  }, [stories, projectId]);

  // Fetch full question details using React Query (cached)
  const { data: fullQuestions = [] } = useSliderQuestionsQuery({
    projectId,
    // Only fetch if we have a valid project ID
    enabled: !!projectId
  });

  // Merge initial questions (from stories) with full details (from API)
  const sliderQuestions = useMemo(() => {
    if (fullQuestions.length === 0) {
      return initialSliderQuestions;
    }

    // Optimization: Build a Map for O(1) lookup, reducing complexity from O(N*M) to O(N+M)
    const fullQuestionsMap = new Map(fullQuestions.map(fq => [String(fq.id), fq]));

    return initialSliderQuestions.map(q => {
      const fullQuestion = fullQuestionsMap.get(String(q.id));
      if (fullQuestion) {
        return {
          ...q,
          text: fullQuestion.question || q.text,
          left_label: fullQuestion.leftLabel || q.left_label,
          right_label: fullQuestion.rightLabel || q.right_label
        };
      }
      return q;
    });
  }, [initialSliderQuestions, fullQuestions]);

  return sliderQuestions;
};

export const useParticipantFilters = (stories: Story[], formParticipantQuestions?: ParticipantQuestion[]) => {
  return useMemo(() => {
    return calculateParticipantFilters(stories, formParticipantQuestions);
  }, [stories, formParticipantQuestions]);
};

export const useChartData = (
  stories: Story[],
  xAxisQuestion: number | string | null,
  yAxisQuestion: number | string | null,
  sliderQuestions: SliderQuestion[],
  filters: Record<string, Set<string>> = {},
  formParticipantQuestions?: ParticipantQuestion[]
) => {
  return useMemo(() => {
    return calculateChartData(stories, xAxisQuestion, yAxisQuestion, sliderQuestions, filters, formParticipantQuestions);
  }, [stories, xAxisQuestion, yAxisQuestion, sliderQuestions, filters, formParticipantQuestions]);
};
