import { Story, SliderResponse } from "@/types/story";
import { SliderQuestion, ParticipantFilter, SliderChartDataPoint } from "./types";
import { ParticipantQuestion } from "@/services/types/designTypes";
import { extractAndUnifyParticipantFilters, getBaseLabel } from "@/utils/participantFilterUtils";

export const calculateParticipantFilters = (stories: Story[], formParticipantQuestions?: ParticipantQuestion[]): ParticipantFilter[] => {
    return extractAndUnifyParticipantFilters(stories, formParticipantQuestions || []);
};

const defaultLabels = { left: "", right: "", text: "Select a question" };

export const calculateChartData = (
    stories: Story[],
    xAxisQuestion: number | string | null,
    yAxisQuestion: number | string | null,
    sliderQuestions: SliderQuestion[],
    filters: Record<string, Set<string>> = {},
    formParticipantQuestions?: ParticipantQuestion[] // Added parameter
): { xAxisLabels: { left: string | undefined; right: string | undefined; text: string }; yAxisLabels: { left: string | undefined; right: string | undefined; text: string }; chartData: SliderChartDataPoint[] } => {

    const xAxisLabels = (() => {
        if (!xAxisQuestion) return defaultLabels;
        let question;
        const len = sliderQuestions.length;
        for (let i = 0; i < len; i++) {
            if (String(sliderQuestions[i].id) === String(xAxisQuestion)) {
                question = sliderQuestions[i];
                break;
            }
        }
        return question
            ? { left: question.left_label, right: question.right_label, text: question.text }
            : defaultLabels;
    })();

    const yAxisLabels = (() => {
        if (!yAxisQuestion) return defaultLabels;
        let question;
        const len = sliderQuestions.length;
        for (let i = 0; i < len; i++) {
            if (String(sliderQuestions[i].id) === String(yAxisQuestion)) {
                question = sliderQuestions[i];
                break;
            }
        }
        return question
            ? { left: question.left_label, right: question.right_label, text: question.text }
            : defaultLabels;
    })();

    if (!xAxisQuestion || !yAxisQuestion) {
        return { xAxisLabels, yAxisLabels, chartData: [] };
    }

    const filterEntries = Object.entries(filters).filter(([, choices]) => choices.size > 0);
    const hasFilters = filterEntries.length > 0;

    const chartData: SliderChartDataPoint[] = [];

    // Optimization: Standard for loops over arrays are faster than for...of and .find
    const storiesLen = stories.length;
    for (let i = 0; i < storiesLen; i++) {
        const story = stories[i];
        
        // Filter based on participant responses if filters are set
        if (hasFilters) {
            if (!story.participantResponses) continue;

            let match = true;
            const participantResponses = story.participantResponses;
            const participantResponsesLen = participantResponses.length;
            
            for (let j = 0; j < filterEntries.length; j++) {
                const [questionId, selectedChoices] = filterEntries[j];
                
                // Optimization: Replace .find with standard indexed for loop
                let responseForQuestion;
                for (let k = 0; k < participantResponsesLen; k++) {
                    if (String(participantResponses[k].question_id) === String(questionId)) {
                        responseForQuestion = participantResponses[k];
                        break;
                    }
                }

                // Check if any of the selected choices match the base label
                if (!responseForQuestion || !selectedChoices.has(getBaseLabel(questionId, responseForQuestion.response, formParticipantQuestions))) {
                    match = false;
                    break;
                }
            }
            if (!match) continue;
        }

        // Check if the story has responses for both selected questions
        if (!story.sliderResponses) continue;

        let xResponse: SliderResponse | undefined;
        let yResponse: SliderResponse | undefined;

        const responses = story.sliderResponses;
        const len = responses.length;
        for (let j = 0; j < len; j++) {
            const r = responses[j];
            if (String(r.question_id) === String(xAxisQuestion) && r.value !== null) xResponse = r;
            if (String(r.question_id) === String(yAxisQuestion) && r.value !== null) yResponse = r;
            if (xResponse && yResponse) break;
        }

        if (xResponse && yResponse) {
            const x = Number(xResponse.value ?? 0);
            const y = Number(yResponse.value ?? 0);

            chartData.push({
                x,
                y,
                storyId: story.id,
                storyTitle: story.title,
                feeling: story.feeling,
                feelingSentiment: story.feelingSentiment,
                xAxisLabel: xAxisLabels.text,
                yAxisLabel: yAxisLabels.text,
                participantResponses: story.participantResponses,
                storyData: story // Include the complete story object
            });
        }
    }

    return { xAxisLabels, yAxisLabels, chartData };
};
