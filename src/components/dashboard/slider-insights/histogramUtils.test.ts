
import { describe, it, expect } from 'vitest';
import { prepareHistogramData, SliderQuestion } from './histogramUtils';
import { Story } from '@/types/story';

describe('prepareHistogramData', () => {
    const mockStories: Story[] = [
        {
            id: '1',
            title: 'Story 1',
            text: 'Text 1',
            feeling: 'happy',
            date: '2023-01-01',
            participantResponses: [
                { id: 'r1', question_id: 'q1', question_text: 'Role', response: 'Developer' }
            ]
        },
        {
            id: '2',
            title: 'Story 2',
            text: 'Text 2',
            feeling: 'sad',
            date: '2023-01-02',
            participantResponses: [
                { id: 'r2', question_id: 'q1', question_text: 'Role', response: 'Manager' }
            ]
        },
        {
            id: '3',
            title: 'Story 3',
            text: 'Text 3',
            feeling: 'neutral',
            date: '2023-01-03',
            participantResponses: [
                { id: 'r3', question_id: 'q1', question_text: 'Role', response: 'Developer' }
            ]
        }
    ];

    const mockQuestion: SliderQuestion = {
        id: 101,
        question_text: 'How happy are you?',
        responses: [80, 20, 50],
        average: 50,
        stories: [
            { id: '1', feeling: 'happy', value: 85 }, // Bin 8 (81-90) -> index 8
            { id: '2', feeling: 'sad', value: 25 },   // Bin 2 (21-30) -> index 2
            { id: '3', feeling: 'neutral', value: 55 } // Bin 5 (51-60) -> index 5
        ]
    };

    const processedStories: Record<string, "positive" | "negative" | "neutral"> = {
        '1': 'positive',
        '2': 'negative',
        '3': 'neutral'
    };

    it('should generate correct histogram bins without filters', () => {
        const bins = prepareHistogramData(mockQuestion, processedStories, {}, mockStories);

        // Check bin counts
        expect(bins[8].count).toBe(1);
        expect(bins[8].positive).toBe(1);

        expect(bins[2].count).toBe(1);
        expect(bins[2].negative).toBe(1);

        expect(bins[5].count).toBe(1);
        expect(bins[5].neutral).toBe(1);

        // Check total count
        const totalCount = bins.reduce((acc, bin) => acc + bin.count, 0);
        expect(totalCount).toBe(3);
    });

    it('should filter stories correctly', () => {
        const filters = {
            'q1': new Set(['Developer'])
        };

        const bins = prepareHistogramData(mockQuestion, processedStories, filters, mockStories);

        // Only Story 1 and Story 3 are Developers
        // Story 1: value 85 -> Bin 8
        // Story 3: value 55 -> Bin 5
        // Story 2 (Manager, value 25) should be filtered out

        expect(bins[8].count).toBe(1);
        expect(bins[5].count).toBe(1);
        expect(bins[2].count).toBe(0);

        const totalCount = bins.reduce((acc, bin) => acc + bin.count, 0);
        expect(totalCount).toBe(2);
    });

    it('should handle multiple filters', () => {
        // Add another filter criteria
        const storiesWithMultiFilters = [
            ...mockStories,
            {
                id: '4',
                title: 'Story 4',
                text: 'Text 4',
                feeling: 'happy',
                date: '2023-01-04',
                participantResponses: [
                    { id: 'r4', question_id: 'q1', question_text: 'Role', response: 'Developer' },
                    { id: 'r5', question_id: 'q2', question_text: 'Exp', response: 'Senior' }
                ]
            }
        ];

        const questionWithMulti = {
            ...mockQuestion,
            stories: [
                ...mockQuestion.stories!,
                { id: '4', feeling: 'happy', value: 95 }
            ]
        };

        const processedWithMulti = {
            ...processedStories,
            '4': 'positive' as const
        };

        const filters = {
            'q1': new Set(['Developer']),
            'q2': new Set(['Senior'])
        };

        const bins = prepareHistogramData(questionWithMulti, processedWithMulti, filters, storiesWithMultiFilters);

        // Only Story 4 matches BOTH filters (Developer AND Senior)
        // Story 1 matches Developer but has no q2 response (assuming logic requires all active filters to match)
        // Story 3 matches Developer but has no q2 response

        expect(bins.reduce((acc, bin) => acc + bin.count, 0)).toBe(1);
        expect(bins[9].count).toBe(1); // 95 -> 91-100 -> index 9
    });

    it('should handle empty stories or question data', () => {
        const bins = prepareHistogramData({ ...mockQuestion, stories: [] }, processedStories, {}, mockStories);
        expect(bins.reduce((acc, bin) => acc + bin.count, 0)).toBe(0);
    });

    it('should handle stories missing from the full list gracefully', () => {
        // Case where question has a story ID that is NOT in the stories array
        const incompleteStories = mockStories.slice(0, 1); // Only story 1

        const bins = prepareHistogramData(mockQuestion, processedStories, {}, incompleteStories);

        // Should process Story 1
        // Story 2 and 3 are in question.stories but not in stories array.
        // If no filters are active, it counts ALL question.stories, even if full story object is missing.
        // This is consistent with current implementation.

        expect(bins.reduce((acc, bin) => acc + bin.count, 0)).toBe(3);

        // Now ADD a filter.
        const filters = { 'q1': new Set(['Developer']) };
        const binsWithFilter = prepareHistogramData(mockQuestion, processedStories, filters, incompleteStories);

        // Now storyPassesFilters is called.
        // Story 1 is found, matches filter -> count 1.
        // Story 2 is NOT found -> returns false -> count 0.
        // Story 3 is NOT found -> returns false -> count 0.

        expect(binsWithFilter.reduce((acc, bin) => acc + bin.count, 0)).toBe(1);
    });
});
