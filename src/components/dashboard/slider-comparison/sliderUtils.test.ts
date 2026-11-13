import { describe, it, expect } from 'vitest';
import { calculateParticipantFilters, calculateChartData } from './sliderUtils';
import { Story } from '@/types/story';
import { SliderQuestion } from './types';

describe('sliderUtils', () => {
    describe('calculateParticipantFilters', () => {
        it('should extract unique participant questions and choices', () => {
            const stories: Story[] = [
                {
                    id: 1,
                    title: 'Story 1',
                    text: 'text',
                    feeling: 'good',
                    date: '2023-01-01',
                    participantResponses: [
                        { id: 'r1', question_id: 'q1', question_text: 'Q1', response: 'Yes' },
                        { id: 'r2', question_id: 'q2', question_text: 'Q2', response: 'Blue' }
                    ]
                },
                {
                    id: 2,
                    title: 'Story 2',
                    text: 'text',
                    feeling: 'bad',
                    date: '2023-01-02',
                    participantResponses: [
                        { id: 'r3', question_id: 'q1', question_text: 'Q1', response: 'No' },
                        { id: 'r4', question_id: 'q2', question_text: 'Q2', response: 'Blue' }
                    ]
                }
            ] as Story[];

            const result = calculateParticipantFilters(stories);

            expect(result).toHaveLength(2);

            const q1 = result.find(r => r.id === 'q1');
            expect(q1).toBeDefined();
            expect(q1?.text).toBe('Q1');
            expect(q1?.choices).toEqual(expect.arrayContaining(['Yes', 'No']));
            expect(q1?.choices).toHaveLength(2);

            const q2 = result.find(r => r.id === 'q2');
            expect(q2).toBeDefined();
            expect(q2?.choices).toEqual(expect.arrayContaining(['Blue']));
            expect(q2?.choices).toHaveLength(1);
        });
    });

    describe('calculateChartData', () => {
        const stories: Story[] = [
            {
                id: 1,
                title: 'Story 1',
                text: 'text',
                feeling: 'good',
                date: '2023-01-01',
                sliderResponses: [
                    { id: 'sr1', question_id: 101, value: 10, response_type: 'answered', question_text: 'SQ1' },
                    { id: 'sr2', question_id: 102, value: 20, response_type: 'answered', question_text: 'SQ2' }
                ],
                participantResponses: [
                    { id: 'pr1', question_id: 'pq1', question_text: 'PQ1', response: 'A' }
                ]
            },
            {
                id: 2,
                title: 'Story 2',
                text: 'text',
                feeling: 'bad',
                date: '2023-01-02',
                sliderResponses: [
                    { id: 'sr3', question_id: 101, value: 30, response_type: 'answered', question_text: 'SQ1' },
                    { id: 'sr4', question_id: 102, value: 40, response_type: 'answered', question_text: 'SQ2' }
                ],
                participantResponses: [
                    { id: 'pr2', question_id: 'pq1', question_text: 'PQ1', response: 'B' }
                ]
            },
            {
                id: 3,
                title: 'Story 3',
                text: 'text',
                feeling: 'neutral',
                date: '2023-01-03',
                sliderResponses: [
                    { id: 'sr5', question_id: 101, value: 50, response_type: 'answered', question_text: 'SQ1' }
                    // Missing 102
                ],
                participantResponses: [
                    { id: 'pr3', question_id: 'pq1', question_text: 'PQ1', response: 'A' }
                ]
            }
        ] as Story[];

        const sliderQuestions: SliderQuestion[] = [
            { id: 101, text: 'SQ1', left_label: 'L1', right_label: 'R1' },
            { id: 102, text: 'SQ2', left_label: 'L2', right_label: 'R2' }
        ];

        it('should return empty data if axes are not selected', () => {
            const result = calculateChartData(stories, null, null, sliderQuestions);
            expect(result.chartData).toHaveLength(0);
        });

        it('should return chart data for selected axes', () => {
            const result = calculateChartData(stories, 101, 102, sliderQuestions);
            expect(result.chartData).toHaveLength(2); // Story 3 is missing Q102
            expect(result.xAxisLabels.text).toBe('SQ1');
            expect(result.yAxisLabels.text).toBe('SQ2');

            const s1 = result.chartData.find(d => d.storyId === 1);
            expect(s1?.x).toBe(10);
            expect(s1?.y).toBe(20);
        });

        it('should filter data based on participant filters', () => {
            const filters = {
                'pq1': new Set(['A'])
            };

            const result = calculateChartData(stories, 101, 102, sliderQuestions, filters);
            expect(result.chartData).toHaveLength(1); // Only Story 1 has 'A' and both sliders. Story 3 has 'A' but missing slider.
            expect(result.chartData[0].storyId).toBe(1);
        });

        it('should support string question IDs and match mixed string/number axes', () => {
            const stringIdStories: Story[] = [
                {
                    id: 10,
                    title: 'String ID Story',
                    text: 'text',
                    feeling: 'good',
                    date: '2023-01-01',
                    sliderResponses: [
                        { id: 'sr-s1', question_id: 'uuid-1', value: 75, response_type: 'answered', question_text: 'Slider 1' },
                        { id: 'sr-s2', question_id: 'uuid-2', value: 25, response_type: 'answered', question_text: 'Slider 2' }
                    ]
                } as unknown as Story
            ];

            const stringQuestions: SliderQuestion[] = [
                { id: 'uuid-1', text: 'Slider 1', left_label: 'L', right_label: 'R' },
                { id: 'uuid-2', text: 'Slider 2', left_label: 'L', right_label: 'R' }
            ];

            const result = calculateChartData(stringIdStories, 'uuid-1', 'uuid-2', stringQuestions);
            expect(result.chartData).toHaveLength(1);
            expect(result.chartData[0].x).toBe(75);
            expect(result.chartData[0].y).toBe(25);
        });

        it('should not plot points for skipped responses or null values', () => {
            const skippedStories: Story[] = [
                {
                    id: 20,
                    title: 'Skipped Story',
                    text: 'text',
                    feeling: 'neutral',
                    date: '2023-01-01',
                    sliderResponses: [
                        { id: 'sr-sk1', question_id: 101, value: null, response_type: 'skipped', question_text: 'SQ1' },
                        { id: 'sr-sk2', question_id: 102, value: 50, response_type: 'answered', question_text: 'SQ2' }
                    ]
                } as unknown as Story
            ];

            const result = calculateChartData(skippedStories, 101, 102, sliderQuestions);
            expect(result.chartData).toHaveLength(0);
        });
    });
});
