import { Story, ParticipantResponse } from "@/types/story";

export interface SliderChartDataPoint {
    x: number;
    y: number;
    storyId: string | number;
    storyTitle: string;
    feeling?: string;
    feelingSentiment?: string;
    xAxisLabel: string;
    yAxisLabel: string;
    participantResponses?: ParticipantResponse[];
    storyData: Story;
}

export interface SliderPoint {
    x: number;
    y: number;
    story?: Story;
}

export interface SliderQuestion {
    id: number | string;
    text: string;
    theme?: string;
    question?: string;
    leftLabel?: string;
    rightLabel?: string;
    sliderValue?: number;
    left_label?: string;
    right_label?: string;
}

export interface ParticipantFilter {
    id: string;
    text: string;
    choices: string[];
}
