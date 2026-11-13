
import { useEffect, useState, useRef } from "react";
import { Story, SliderResponse } from "@/types/story";
import { SliderQuestion } from "../histogramUtils";
import { useSliderQuestionsQuery } from "@/hooks/queries/useSliderQuestionsQuery";
import { debugLog } from "@/utils/debugLogger";
import { useOptionalProject } from "@/contexts/ProjectContext";

/**
 * Custom hook to process slider questions from stories
 */
interface EnrichedQuestion {
  id: number | string;
  question?: string;
  leftLabel?: string;
  rightLabel?: string;
}

const EMPTY_ARRAY: EnrichedQuestion[] = [];

export function useSliderQuestionsProcess(stories: Story[], projectIdProp?: string) {
  const [questionList, setQuestionList] = useState<SliderQuestion[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);

  const contextProjectId = useOptionalProject()?.activeProject?.id;
  const projectId = projectIdProp || contextProjectId;

  // Track project switching
  const prevProjectIdRef = useRef<string | undefined>(projectId);

  // Use TanStack Query to get the full question details (as optional progressive enrichment)
  const { data: enrichedQuestions = EMPTY_ARRAY, isFetching: isEnriching } = useSliderQuestionsQuery({
    projectId,
    isTemplateProject: false,
    enabled: !!projectId
  });

  // Reset selected question on project switch to avoid retaining stale questions
  useEffect(() => {
    if (prevProjectIdRef.current !== projectId) {
      prevProjectIdRef.current = projectId;
      setSelectedQuestionId(null);
    }
  }, [projectId]);

  // Debug log the enriched questions
  useEffect(() => {
    if (enrichedQuestions.length > 0) {
      debugLog("useSliderQuestionsProcess - Enriched questions loaded:",
        enrichedQuestions.map(q => ({ id: q.id, question: q.question?.substring(0, 30) }))
      );
    }
  }, [enrichedQuestions]);

  // Extract and organize slider data from stories
  useEffect(() => {
    setIsProcessing(true);
    const sliderQuestions: Record<string, SliderQuestion> = {};

    // Build a Map for O(1) enriched question lookups (avoids O(N×M) nested .find)
    const enrichedMap = new Map<string, EnrichedQuestion>();
    for (let i = 0; i < enrichedQuestions.length; i++) {
      enrichedMap.set(String(enrichedQuestions[i].id), enrichedQuestions[i]);
    }

    // Single pass: collect all slider questions and responses
    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      // Guard against transitional stories from a previous project during project switch
      if (projectId && story.project_id && story.project_id !== projectId) {
        continue;
      }

      if (story.sliderResponses && Array.isArray(story.sliderResponses)) {
        for (let j = 0; j < story.sliderResponses.length; j++) {
          const response: SliderResponse = story.sliderResponses[j];
          const qIdStr = String(response.question_id);

          if (!sliderQuestions[qIdStr]) {
            const enrichedQuestion = enrichedMap.get(qIdStr);
            sliderQuestions[qIdStr] = {
              id: response.question_id,
              question_text: enrichedQuestion?.question || response.question_text || `Question ${response.question_id}`,
              left_label: enrichedQuestion?.leftLabel || response.left_label || "Low",
              right_label: enrichedQuestion?.rightLabel || response.right_label || "High",
              responses: [],
              average: 0,
              stories: []
            };
          }

          if (typeof response.value === 'number') {
            sliderQuestions[qIdStr].responses.push(response.value);
            sliderQuestions[qIdStr].stories?.push({
              id: String(story.id),
              feeling: story.feeling || 'neutral',
              value: response.value
            });
          }
        }
      }
    }

    // Calculate averages and prepare question list
    // Optimization: Replaced chaining .map().filter() and nested .filter().reduce() with a standard for loop
    // to avoid V8 callback overhead when iterating over thousands of story responses in the dashboard pipeline.
    const sliderQuestionsValues = Object.values(sliderQuestions);
    const processedQuestions: SliderQuestion[] = [];

    for (let i = 0; i < sliderQuestionsValues.length; i++) {
      const question = sliderQuestionsValues[i];
      let sum = 0;
      let validCount = 0;

      const responsesLen = question.responses.length;
      for (let j = 0; j < responsesLen; j++) {
        const r = question.responses[j];
        if (typeof r === 'number') {
          sum += r;
          validCount++;
        }
      }

      question.average = validCount > 0
        ? Math.round((sum / validCount) * 10) / 10
        : 0;

      if (question.responses.length > 0) {
        processedQuestions.push(question);
      }
    }

    // Sort questions by number of responses (descending)
    processedQuestions.sort((a, b) => b.responses.length - a.responses.length);

    // Debug logging
    debugLog("useSliderQuestionsProcess - Processed questions:",
      processedQuestions.map(q => ({
        id: q.id,
        text: q.question_text.substring(0, 30) + "...",
        responsesCount: q.responses.length
      }))
    );

    setQuestionList(processedQuestions);
    setIsProcessing(false);
  }, [stories, enrichedQuestions, projectId]);

  // Handle question selection and ensure stale questions from prior projects are never retained
  useEffect(() => {
    if (questionList.length === 0) {
      if (selectedQuestionId !== null) {
        setSelectedQuestionId(null);
      }
    } else if (selectedQuestionId === null || !questionList.some(q => q.id === selectedQuestionId)) {
      // If no question is selected or selectedQuestionId is not in the current project's list, select first
      setSelectedQuestionId(questionList[0].id);
    }
  }, [questionList, selectedQuestionId]);

  return {
    questionList,
    selectedQuestionId,
    setSelectedQuestionId,
    // Find the selected question or default to the first question
    selectedQuestion: selectedQuestionId !== null
      ? questionList.find(q => q.id === selectedQuestionId)
      : questionList[0],
    loading: isProcessing,
    isEnriching
  };
}
