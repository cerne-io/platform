import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import SliderComparisonChart from '../../SliderComparisonChart';
import { Story } from '@/types/story';

// Mock sub-components and queries
vi.mock('@/hooks/queries/useFormDataQuery', () => ({
  useFormDataQuery: vi.fn(() => ({ data: null })),
}));

vi.mock('@/hooks/queries/useSliderQuestionsQuery', () => ({
  useSliderQuestionsQuery: vi.fn(() => ({ data: [] })),
}));

vi.mock('../slider-comparison/SliderAnalysisCard', () => ({
  default: ({ xAxisQuestionId, yAxisQuestionId, chartData }: { xAxisQuestionId: number; yAxisQuestionId: number; chartData: unknown[] }) => (
    <div data-testid="slider-analysis-card">
      <span data-testid="xaxis-id">{xAxisQuestionId}</span>
      <span data-testid="yaxis-id">{yAxisQuestionId}</span>
      <span data-testid="points-count">{chartData.length}</span>
    </div>
  ),
}));

vi.mock('../SliderAnalysisCard', () => ({
  default: ({ xAxisQuestionId, yAxisQuestionId, chartData }: { xAxisQuestionId: number; yAxisQuestionId: number; chartData: unknown[] }) => (
    <div data-testid="slider-analysis-card">
      <span data-testid="xaxis-id">{xAxisQuestionId}</span>
      <span data-testid="yaxis-id">{yAxisQuestionId}</span>
      <span data-testid="points-count">{chartData.length}</span>
    </div>
  ),
}));

vi.mock('@/utils/debugLogger', () => ({
  debugLog: vi.fn(),
  debugError: vi.fn(),
}));

describe('SliderComparisonChart - Project Switching and Data Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const projectAStories: Story[] = [
    {
      id: 'story-1',
      title: 'Story 1',
      text: 'Text 1',
      project_id: 'project-a',
      sliderResponses: [
        { id: 'sr-1', question_id: 1, question_text: 'Impact', value: 25, left_label: 'Low', right_label: 'High' },
        { id: 'sr-2', question_id: 2, question_text: 'Urgency', value: 75, left_label: 'Low', right_label: 'High' },
      ],
    } as unknown as Story,
    {
      id: 'story-2',
      title: 'Story 2',
      text: 'Text 2',
      project_id: 'project-a',
      sliderResponses: [
        { id: 'sr-3', question_id: 1, question_text: 'Impact', value: 50, left_label: 'Low', right_label: 'High' },
        { id: 'sr-4', question_id: 2, question_text: 'Urgency', value: 90, left_label: 'Low', right_label: 'High' },
      ],
    } as unknown as Story,
  ];

  const projectBStories: Story[] = [
    {
      id: 'story-b1',
      title: 'Story B1',
      text: 'Text B1',
      project_id: 'project-b',
      sliderResponses: [
        { id: 'sr-b1', question_id: 50, question_text: 'Complexity', value: 60, left_label: 'Simple', right_label: 'Complex' },
        { id: 'sr-b2', question_id: 60, question_text: 'Feasibility', value: 80, left_label: 'Hard', right_label: 'Easy' },
      ],
    } as unknown as Story,
  ];

  const projectSingleQuestionStories: Story[] = [
    {
      id: 'story-single-1',
      title: 'Single Q Story',
      text: 'Single Q Text',
      project_id: 'project-single',
      sliderResponses: [
        { id: 'sr-s1', question_id: 77, question_text: 'Satisfaction', value: 85, left_label: 'Low', right_label: 'High' },
      ],
    } as unknown as Story,
  ];

  it('automatically defaults axes to available questions and computes chart points', () => {
    render(
      <SliderComparisonChart
        stories={projectAStories}
        projectId="project-a"
      />
    );

    // Initial render should automatically choose the 2 available questions (1 and 2)
    expect(screen.getByTestId('xaxis-id').textContent).toBe('1');
    expect(screen.getByTestId('yaxis-id').textContent).toBe('2');
    expect(screen.getByTestId('points-count').textContent).toBe('2');
  });

  it('resets invalid axes when switching from Project A to Project B', () => {
    const { rerender } = render(
      <SliderComparisonChart
        stories={projectAStories}
        projectId="project-a"
      />
    );

    expect(screen.getByTestId('xaxis-id').textContent).toBe('1');
    expect(screen.getByTestId('yaxis-id').textContent).toBe('2');

    // Switch to Project B
    rerender(
      <SliderComparisonChart
        stories={projectBStories}
        projectId="project-b"
      />
    );

    // Project B has questions 50 and 60. Stale questions 1 and 2 must NOT be retained!
    expect(screen.getByTestId('xaxis-id').textContent).toBe('50');
    expect(screen.getByTestId('yaxis-id').textContent).toBe('60');
    expect(screen.getByTestId('points-count').textContent).toBe('1');
  });

  it('safely handles transitional state where projectId changes to Project B while stories still contain Project A data', () => {
    const { rerender } = render(
      <SliderComparisonChart
        stories={projectAStories}
        projectId="project-a"
      />
    );

    expect(screen.getByTestId('xaxis-id').textContent).toBe('1');
    expect(screen.getByTestId('yaxis-id').textContent).toBe('2');
    expect(screen.getByTestId('points-count').textContent).toBe('2');

    // Transitional step: projectId updated to 'project-b', but stories prop still holds projectAStories!
    rerender(
      <SliderComparisonChart
        stories={projectAStories}
        projectId="project-b"
      />
    );

    // Must NOT plot Project A's responses under Project B!
    // Transitional stories belonging to 'project-a' are filtered out -> 0 points / insufficient questions
    expect(screen.queryByText(/Not enough slider questions with responses/i)).toBeDefined();
    expect(screen.queryByTestId('slider-analysis-card')).toBeNull();

    // Now Project B's stories resolve and arrive
    rerender(
      <SliderComparisonChart
        stories={projectBStories}
        projectId="project-b"
      />
    );

    // Now correctly renders Project B questions
    expect(screen.getByTestId('xaxis-id').textContent).toBe('50');
    expect(screen.getByTestId('yaxis-id').textContent).toBe('60');
    expect(screen.getByTestId('points-count').textContent).toBe('1');
  });

  it('preserves valid URL-restored axes (initialContext) and does not overwrite with defaults', () => {
    render(
      <SliderComparisonChart
        stories={projectBStories}
        projectId="project-b"
        initialContext={{
          source: 'slider_selection',
          questionId: '60',
          secondaryQuestionId: '50',
          groups: [
            { id: 'A', storyIds: [], createdAt: '', selectionMethod: 'drag_selection', questionId: '60', selectionCount: 0 },
            { id: 'B', storyIds: [], createdAt: '', selectionMethod: 'drag_selection', questionId: '50', selectionCount: 0 },
          ],
          sharedStoryIds: [],
        }}
      />
    );

    // Should preserve inverted axis order from initialContext (X=60, Y=50) instead of default (X=50, Y=60)
    expect(screen.getByTestId('xaxis-id').textContent).toBe('60');
    expect(screen.getByTestId('yaxis-id').textContent).toBe('50');
  });

  it('handles projects with zero, one, and two available slider questions', () => {
    // 1. Zero questions: empty project
    const { rerender } = render(
      <SliderComparisonChart
        stories={[]}
        projectId="project-empty"
      />
    );
    expect(screen.getByText(/Not enough slider questions with responses/i)).toBeDefined();
    expect(screen.queryByTestId('slider-analysis-card')).toBeNull();

    // 2. One question: requires at least 2 questions for 2D comparison chart
    rerender(
      <SliderComparisonChart
        stories={projectSingleQuestionStories}
        projectId="project-single"
      />
    );
    expect(screen.getByText(/Not enough slider questions with responses/i)).toBeDefined();
    expect(screen.queryByTestId('slider-analysis-card')).toBeNull();

    // 3. Two questions: renders 2D comparison chart successfully
    rerender(
      <SliderComparisonChart
        stories={projectAStories}
        projectId="project-a"
      />
    );
    expect(screen.queryByText(/Not enough slider questions with responses/i)).toBeNull();
    expect(screen.getByTestId('slider-analysis-card')).toBeDefined();
    expect(screen.getByTestId('xaxis-id').textContent).toBe('1');
    expect(screen.getByTestId('yaxis-id').textContent).toBe('2');
  });
});
