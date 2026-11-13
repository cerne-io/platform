import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSliderQuestionsProcess } from '../useSliderQuestionsProcess';
import { Story } from '@/types/story';

// Mock useSliderQuestionsQuery
let mockEnrichedQuestions: { id: number; question?: string; leftLabel?: string; rightLabel?: string }[] = [];
let mockIsFetching = false;

vi.mock('@/hooks/queries/useSliderQuestionsQuery', () => ({
  useSliderQuestionsQuery: vi.fn(() => ({
    data: mockEnrichedQuestions,
    isFetching: mockIsFetching,
  })),
}));

vi.mock('@/utils/debugLogger', () => ({
  debugLog: vi.fn(),
  debugError: vi.fn(),
}));

describe('useSliderQuestionsProcess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnrichedQuestions.length = 0;
    mockIsFetching = false;
  });

  const sampleStoriesProjectA: Story[] = [
    {
      id: 'story-1',
      title: 'Story 1',
      text: 'Text 1',
      project_id: 'project-a',
      sliderResponses: [
        {
          id: 'sr-1',
          question_id: 101,
          question_text: 'Original Q101',
          value: 70,
          left_label: 'Disagree',
          right_label: 'Agree',
        },
        {
          id: 'sr-2',
          question_id: 102,
          question_text: 'Original Q102',
          value: 40,
          left_label: 'Low',
          right_label: 'High',
        },
      ],
    } as unknown as Story,
    {
      id: 'story-2',
      title: 'Story 2',
      text: 'Text 2',
      project_id: 'project-a',
      sliderResponses: [
        {
          id: 'sr-3',
          question_id: 101,
          question_text: 'Original Q101',
          value: 90,
          left_label: 'Disagree',
          right_label: 'Agree',
        },
      ],
    } as unknown as Story,
  ];

  const sampleStoriesProjectB: Story[] = [
    {
      id: 'story-99',
      title: 'Story 99',
      text: 'Text 99',
      project_id: 'project-b',
      sliderResponses: [
        {
          id: 'sr-99',
          question_id: 999,
          question_text: 'Project B Question',
          value: 85,
          left_label: 'Never',
          right_label: 'Always',
        },
      ],
    } as unknown as Story,
  ];

  it('immediately derives usable questions from story responses without waiting for canonical enrichment', () => {
    mockIsFetching = true; // Canonical enrichment is still in flight

    const { result } = renderHook(() =>
      useSliderQuestionsProcess(sampleStoriesProjectA, 'project-a')
    );

    // Should NOT be blocked on loading
    expect(result.current.loading).toBe(false);
    expect(result.current.isEnriching).toBe(true);

    // Questions derived directly from story responses
    expect(result.current.questionList.length).toBe(2);
    expect(result.current.questionList[0].id).toBe(101);
    expect(result.current.questionList[0].question_text).toBe('Original Q101');
    expect(result.current.questionList[0].left_label).toBe('Disagree');
    expect(result.current.questionList[0].right_label).toBe('Agree');
    expect(result.current.questionList[0].average).toBe(80); // (70 + 90) / 2
    expect(result.current.selectedQuestionId).toBe(101);
  });

  it('progressively enhances questions when canonical questions arrive', () => {
    mockEnrichedQuestions = [];

    const { result, rerender } = renderHook(() =>
      useSliderQuestionsProcess(sampleStoriesProjectA, 'project-a')
    );

    expect(result.current.questionList[0].question_text).toBe('Original Q101');

    // Simulate canonical enrichment arriving with fresh array reference
    mockEnrichedQuestions = [
      { id: 101, question: 'Canonical Question 101', leftLabel: 'Strongly Disagree', rightLabel: 'Strongly Agree' }
    ];
    rerender();

    expect(result.current.questionList[0].question_text).toBe('Canonical Question 101');
    expect(result.current.questionList[0].left_label).toBe('Strongly Disagree');
    expect(result.current.questionList[0].right_label).toBe('Strongly Agree');
    expect(result.current.questionList[0].average).toBe(80); // Data averages preserved
  });

  it('handles stories loaded without responses: returns empty question list with loading=false', () => {
    const emptyStories: Story[] = [];

    const { result } = renderHook(() =>
      useSliderQuestionsProcess(emptyStories, 'project-empty')
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.questionList).toEqual([]);
    expect(result.current.selectedQuestionId).toBeNull();
    expect(result.current.selectedQuestion).toBeUndefined();
  });

  it('cleans up stale question selection on project switching', () => {
    let currentProject = 'project-a';
    let currentStories = sampleStoriesProjectA;

    const { result, rerender } = renderHook(() =>
      useSliderQuestionsProcess(currentStories, currentProject)
    );

    expect(result.current.selectedQuestionId).toBe(101);

    // Switch to question 102
    act(() => {
      result.current.setSelectedQuestionId(102);
    });
    expect(result.current.selectedQuestionId).toBe(102);

    // Switch to Project B
    currentProject = 'project-b';
    currentStories = sampleStoriesProjectB;
    rerender();

    // Must NOT retain question 102 from Project A!
    expect(result.current.selectedQuestionId).toBe(999);
    expect(result.current.questionList[0].id).toBe(999);
    expect(result.current.questionList[0].question_text).toBe('Project B Question');
  });

  it('safely handles transitional state where projectId changes to Project B while stories still contain Project A data', () => {
    let currentProject = 'project-a';
    let currentStories = sampleStoriesProjectA;

    const { result, rerender } = renderHook(() =>
      useSliderQuestionsProcess(currentStories, currentProject)
    );

    expect(result.current.selectedQuestionId).toBe(101);

    // Transitional step: projectId updated to 'project-b', but stories prop still holds projectAStories!
    currentProject = 'project-b';
    rerender();

    // Must NOT process or select Project A's questions under Project B!
    // Transitional stories belonging to 'project-a' are filtered out -> questionList is empty, selectedQuestionId is null
    expect(result.current.questionList).toEqual([]);
    expect(result.current.selectedQuestionId).toBeNull();

    // Now Project B's stories resolve and arrive
    currentStories = sampleStoriesProjectB;
    rerender();

    expect(result.current.selectedQuestionId).toBe(999);
    expect(result.current.questionList.length).toBe(1);
    expect(result.current.questionList[0].id).toBe(999);
  });

  it('handles projects with zero, one, and two available slider questions', () => {
    // 1. Zero questions: empty stories
    const { result, rerender } = renderHook(
      ({ stories, projectId }) => useSliderQuestionsProcess(stories, projectId),
      {
        initialProps: { stories: [] as Story[], projectId: 'project-zero' },
      }
    );
    expect(result.current.questionList).toEqual([]);
    expect(result.current.selectedQuestionId).toBeNull();

    // 2. One question: stories with single slider question
    rerender({
      stories: sampleStoriesProjectB,
      projectId: 'project-b',
    });
    expect(result.current.questionList.length).toBe(1);
    expect(result.current.selectedQuestionId).toBe(999);

    // 3. Two questions: stories with two slider questions
    rerender({
      stories: sampleStoriesProjectA,
      projectId: 'project-a',
    });
    expect(result.current.questionList.length).toBe(2);
    expect(result.current.selectedQuestionId).toBe(101);
  });
});
