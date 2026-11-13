import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { CreateFormAction } from '../CreateFormAction';
import { aiAssistantService } from '@/services/aiAssistantService';
import { generateWithAI } from '@/hooks/slider-questions/sliderQuestionAIGenerator';
import { generateTriangleQuestionsWithAI } from '@/hooks/triangle-questions/modules/aiGenerator';
import { generateParticipantQuestionsWithAI } from '@/services/ai/participantQuestionGenerator';
import { saveActivityResponse } from '@/services/supabaseSync/operations/save/saveActivityResponse';
import { getQuestionType } from '@/services/formConfig/questionTypeService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/contexts/ProjectContext', () => ({
  useProject: () => ({
    activeProject: { id: 'test-project-123', name: 'Customer Experience Inquiry' },
  }),
}));

vi.mock('@/hooks/queries/useStoriesQuery', () => ({
  useStoriesQuery: () => ({
    data: [],
  }),
}));

vi.mock('@/hooks/mutations/useInvalidateDesign', () => ({
  useInvalidateDesign: () => vi.fn(),
}));

vi.mock('@/services/factors/useInfluencingFactors', () => ({
  useInfluencingFactors: () => ({
    getInfluencingFactors: vi.fn().mockResolvedValue(['Transparency', 'Speed', 'Communication']),
  }),
}));

vi.mock('@/services/formConfig/questionTypeService', () => ({
  getQuestionType: vi.fn().mockResolvedValue('slider'),
  saveQuestionType: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/utils/project-context/prepareProjectContext', () => ({
  prepareProjectContext: vi.fn().mockResolvedValue({ context: 'Mock project context' }),
}));

vi.mock('@/services/aiAssistantService', () => ({
  aiAssistantService: {
    callAssistant: vi.fn(),
  },
}));

vi.mock('@/services/sync/storyQuestionSyncService', () => ({
  saveStoryQuestionWithSync: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/hooks/slider-questions/sliderQuestionAIGenerator', () => ({
  generateWithAI: vi.fn(),
}));

vi.mock('@/services/sync/sliderQuestionsSyncService', () => ({
  saveSliderQuestionsWithSync: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/hooks/triangle-questions/modules/aiGenerator', () => ({
  generateTriangleQuestionsWithAI: vi.fn(),
}));

vi.mock('@/services/sync/triangleQuestionsSyncService', () => ({
  saveTriangleQuestionsWithSync: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/services/ai/participantQuestionGenerator', () => ({
  generateParticipantQuestionsWithAI: vi.fn(),
}));

vi.mock('@/services/sync/participantQuestionsSyncService', () => ({
  saveParticipantQuestionsWithSync: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/services/supabaseSync/operations/save/saveActivityResponse', () => ({
  saveActivityResponse: vi.fn().mockResolvedValue(true),
}));

describe('CreateFormAction', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CreateFormAction projectId="test-project-123" hasContext={true} />
        </BrowserRouter>
      </QueryClientProvider>
    );

  it('generates Form Builder questions with story question, emotional response, 3 sliders, and 2-3 participant questions', async () => {
    // Setup AI mock returns
    vi.mocked(aiAssistantService.callAssistant).mockResolvedValueOnce({
      response: 'What was a moment when you felt supported by the team?',
      error: null,
      errorCode: null,
    });

    vi.mocked(generateWithAI).mockResolvedValueOnce([
      { id: 1, theme: 'Support', question: 'How supported did you feel?', leftLabel: 'Isolated', rightLabel: 'Supported', sliderValue: 50 },
      { id: 2, theme: 'Clarity', question: 'How clear were the goals?', leftLabel: 'Unclear', rightLabel: 'Clear', sliderValue: 50 },
      { id: 3, theme: 'Speed', question: 'How fast was the resolution?', leftLabel: 'Slow', rightLabel: 'Fast', sliderValue: 50 },
      { id: 4, theme: 'Extra', question: 'Extra question to slice', leftLabel: 'A', rightLabel: 'B', sliderValue: 50 },
    ]);

    vi.mocked(generateParticipantQuestionsWithAI).mockResolvedValueOnce([
      {
        id: 'pq-1',
        label: 'What is your primary work location?',
        choices: [
          { id: 'c1', label: 'Headquarters' },
          { id: 'c2', label: 'Remote' },
        ],
      },
      {
        id: 'pq-2',
        label: 'How long have you worked here?',
        choices: [
          { id: 'c3', label: '< 1 year' },
          { id: 'c4', label: '1+ years' },
        ],
      },
    ]);

    renderComponent();

    const createBtn = screen.getByRole('button', { name: /create form/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Form Created')).toBeInTheDocument();
    });

    // Check saveActivityResponse for form-builder-questions
    expect(saveActivityResponse).toHaveBeenCalledWith(
      'test-project-123',
      'design',
      'form-builder',
      'form-builder-questions',
      expect.any(Array)
    );

    // Retrieve saved questions
    const calls = vi.mocked(saveActivityResponse).mock.calls;
    const builderCall = calls.find(
      (c) => c[0] === 'test-project-123' && c[1] === 'design' && c[2] === 'form-builder' && c[3] === 'form-builder-questions'
    );
    expect(builderCall).toBeDefined();

    const questions = builderCall![4] as Array<{
      type: string;
      label: string;
      options?: Array<{ id: string; label: string }>;
      sliderConfig?: { leftLabel: string; rightLabel: string };
    }>;

    // 1) Story question
    expect(questions[0].type).toBe('story-question');
    expect(questions[0].label).toContain('supported by the team');

    // 2) Default emotional response
    expect(questions[1].type).toBe('emotional-response');
    expect(questions[1].label).toBe('How do you feel about the experience you shared?');
    expect(questions[1].options?.map((o) => o.id)).toEqual([
      'enthusiastic',
      'confused',
      'frustrated',
      'engaged',
      'other',
    ]);

    // 3) Exactly 3 sliders
    const sliders = questions.filter((q) => q.type === 'slider');
    expect(sliders).toHaveLength(3);
    expect(sliders[0].label).toBe('How supported did you feel?');
    expect(sliders[1].label).toBe('How clear were the goals?');
    expect(sliders[2].label).toBe('How fast was the resolution?');

    // 4) 2-3 participant questions
    const pqs = questions.filter((q) => q.type === 'participant-questions');
    expect(pqs).toHaveLength(2);
    expect(pqs[0].label).toBe('What is your primary work location?');
    expect(pqs[1].label).toBe('How long have you worked here?');

    // Verify that form-languages was saved with default 'en' for English content
    expect(saveActivityResponse).toHaveBeenCalledWith(
      'test-project-123',
      'build',
      'form-appearance',
      'form-languages',
      { enabledLanguages: ['en'], defaultLanguage: 'en' }
    );

    // Clicking "Review in Form Builder" navigates to /design?step=form-builder
    const reviewBtn = screen.getByRole('button', { name: /review in form builder/i });
    fireEvent.click(reviewBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/design?step=form-builder');
  });

  it('automatically sets form language to pt-BR when context/response is in Brazilian Portuguese', async () => {
    vi.mocked(aiAssistantService.callAssistant).mockResolvedValueOnce({
      response: 'Conte-nos sobre uma experiência recente com a sua equipe onde você sentiu que o trabalho foi produtivo.',
      error: null,
      errorCode: null,
    });

    vi.mocked(generateWithAI).mockResolvedValueOnce([
      { id: 1, theme: 'Suporte', question: 'Como você avalia o suporte?', leftLabel: 'Baixo', rightLabel: 'Alto', sliderValue: 50 },
    ]);

    vi.mocked(generateParticipantQuestionsWithAI).mockResolvedValueOnce([
      {
        id: 'pq-1',
        label: 'Qual é o seu departamento?',
        choices: [{ id: 'c1', label: 'Operações' }],
      },
    ]);

    renderComponent();

    const createButton = screen.getByText(/Create form \(Sliders\)/i).closest('button')!;
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(saveActivityResponse).toHaveBeenCalledWith(
        'test-project-123',
        'build',
        'form-appearance',
        'form-languages',
        { enabledLanguages: ['pt-BR'], defaultLanguage: 'pt-BR' }
      );
    });

    const calls = vi.mocked(saveActivityResponse).mock.calls;
    const builderCall = calls.find(
      (c) => c[0] === 'test-project-123' && c[1] === 'design' && c[2] === 'form-builder' && c[3] === 'form-builder-questions'
    );
    expect(builderCall).toBeDefined();

    const questions = builderCall![4] as Array<{
      type: string;
      label: string;
      placeholder?: string;
      options?: Array<{ id: string; label: string }>;
    }>;

    // Story question has Portuguese placeholder
    expect(questions[0].placeholder).toBe('Por favor, compartilhe sua experiência aqui...');

    // Emotional response is localized in Portuguese
    const emotionalQ = questions.find((q) => q.type === 'emotional-response');
    expect(emotionalQ).toBeDefined();
    expect(emotionalQ!.label).toBe('Como você se sente em relação à experiência que compartilhou?');
    expect(emotionalQ!.options?.map((o) => o.label)).toEqual([
      'Entusiasmado',
      'Confuso',
      'Frustrado',
      'Engajado',
      'Outro',
    ]);
  });

  it('generates Form Builder questions with 3 triangles when question type is triangle', async () => {
    vi.mocked(getQuestionType).mockResolvedValueOnce('triangle');

    vi.mocked(aiAssistantService.callAssistant).mockResolvedValueOnce({
      response: 'Can you share a story about a project deadline?',
      error: null,
      errorCode: null,
    });

    vi.mocked(generateTriangleQuestionsWithAI).mockResolvedValueOnce([
      { id: 1, theme: 'Balance 1', question: 'Triangle Q1', topLabel: 'Speed', bottomLeftLabel: 'Cost', bottomRightLabel: 'Quality' },
      { id: 2, theme: 'Balance 2', question: 'Triangle Q2', topLabel: 'A', bottomLeftLabel: 'B', bottomRightLabel: 'C' },
      { id: 3, theme: 'Balance 3', question: 'Triangle Q3', topLabel: 'X', bottomLeftLabel: 'Y', bottomRightLabel: 'Z' },
      { id: 4, theme: 'Balance 4', question: 'Triangle Q4 (Extra)', topLabel: '1', bottomLeftLabel: '2', bottomRightLabel: '3' },
    ]);

    vi.mocked(generateParticipantQuestionsWithAI).mockResolvedValueOnce([
      {
        id: 'pq-1',
        label: 'Role',
        choices: [{ id: 'r1', label: 'Dev' }, { id: 'r2', label: 'Design' }],
      },
      {
        id: 'pq-2',
        label: 'Department',
        choices: [{ id: 'd1', label: 'Product' }, { id: 'd2', label: 'Engineering' }],
      },
      {
        id: 'pq-3',
        label: 'Seniority',
        choices: [{ id: 's1', label: 'Junior' }, { id: 's2', label: 'Senior' }],
      },
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CreateFormAction projectId="test-project-123" hasContext={true} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for initial question type 'triangle' to load from getQuestionType
    await waitFor(() => {
      expect(screen.getByText(/Create form \(Triangles\)/i)).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /create form/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Form Created')).toBeInTheDocument();
    });

    const calls = vi.mocked(saveActivityResponse).mock.calls;
    const builderCall = calls.find(
      (c) => c[0] === 'test-project-123' && c[1] === 'design' && c[2] === 'form-builder' && c[3] === 'form-builder-questions'
    );
    expect(builderCall).toBeDefined();

    const questions = builderCall![4] as Array<{
      type: string;
      label: string;
      triangleConfig?: { topLabel: string };
    }>;

    // Check triangle questions count is exactly 3
    const triangles = questions.filter((q) => q.type === 'triangle');
    expect(triangles).toHaveLength(3);
    expect(triangles[0].label).toBe('Triangle Q1');
    expect(triangles[1].label).toBe('Triangle Q2');
    expect(triangles[2].label).toBe('Triangle Q3');

    // Participant questions count is 3
    const pqs = questions.filter((q) => q.type === 'participant-questions');
    expect(pqs).toHaveLength(3);

    // Emotional response is present
    expect(questions.some((q) => q.type === 'emotional-response')).toBe(true);
  });

  it('generates Form Builder questions with both sliders and triangles when question type is both', async () => {
    vi.mocked(getQuestionType).mockResolvedValueOnce('both');

    vi.mocked(aiAssistantService.callAssistant).mockResolvedValueOnce({
      response: 'Tell us about a time you had to adapt quickly.',
      error: null,
      errorCode: null,
    });

    vi.mocked(generateWithAI).mockResolvedValueOnce([
      { id: 1, theme: 'Flexibility', question: 'Slider 1', leftLabel: 'Rigid', rightLabel: 'Flexible', sliderValue: 50 },
      { id: 2, theme: 'Pace', question: 'Slider 2', leftLabel: 'Slow', rightLabel: 'Fast', sliderValue: 50 },
      { id: 3, theme: 'Autonomy', question: 'Slider 3', leftLabel: 'Low', rightLabel: 'High', sliderValue: 50 },
    ]);

    vi.mocked(generateTriangleQuestionsWithAI).mockResolvedValueOnce([
      { id: 1, theme: 'Tri 1', question: 'Triangle 1', topLabel: 'A', bottomLeftLabel: 'B', bottomRightLabel: 'C' },
      { id: 2, theme: 'Tri 2', question: 'Triangle 2', topLabel: 'D', bottomLeftLabel: 'E', bottomRightLabel: 'F' },
      { id: 3, theme: 'Tri 3', question: 'Triangle 3', topLabel: 'G', bottomLeftLabel: 'H', bottomRightLabel: 'I' },
    ]);

    vi.mocked(generateParticipantQuestionsWithAI).mockResolvedValueOnce([
      {
        id: 'pq-1',
        label: 'Function',
        choices: [{ id: 'f1', label: 'Tech' }, { id: 'f2', label: 'Ops' }],
      },
      {
        id: 'pq-2',
        label: 'Tenure',
        choices: [{ id: 't1', label: '1yr' }, { id: 't2', label: '5yr' }],
      },
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CreateFormAction projectId="test-project-123" hasContext={true} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Create form \(Both\)/i)).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /create form/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Form Created')).toBeInTheDocument();
    });

    const calls = vi.mocked(saveActivityResponse).mock.calls;
    const builderCall = calls.find(
      (c) => c[0] === 'test-project-123' && c[1] === 'design' && c[2] === 'form-builder' && c[3] === 'form-builder-questions'
    );
    expect(builderCall).toBeDefined();

    const questions = builderCall![4] as Array<{ type: string; label: string }>;

    // 1 story question + 1 emotional response + 3 sliders + 3 triangles + 2 participant questions = 10 questions total
    expect(questions).toHaveLength(10);
    expect(questions[0].type).toBe('story-question');
    expect(questions[1].type).toBe('emotional-response');
    expect(questions.filter((q) => q.type === 'slider')).toHaveLength(3);
    expect(questions.filter((q) => q.type === 'triangle')).toHaveLength(3);
    expect(questions.filter((q) => q.type === 'participant-questions')).toHaveLength(2);
  });

  it('shows an error dialog and does not save fallback questions when AI fails to generate', async () => {
    vi.mocked(getQuestionType).mockResolvedValueOnce('slider');

    // Simulate AI failing to generate story question
    vi.mocked(aiAssistantService.callAssistant).mockResolvedValueOnce({
      response: '',
      error: 'Model overloaded',
      errorCode: 'MODEL_OVERLOADED',
    });

    vi.mocked(generateWithAI).mockResolvedValueOnce(null);
    vi.mocked(generateParticipantQuestionsWithAI).mockResolvedValueOnce(null);

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CreateFormAction projectId="test-project-123" hasContext={true} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const createBtn = screen.getByRole('button', { name: /create form/i });
    fireEvent.click(createBtn);

    // Verify AI generation unavailable dialog appears with note
    await waitFor(() => {
      expect(screen.getByText('AI Generation Unavailable')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/AI could not generate the content at this time. Please try again later or enter your questions manually in Form Builder./i)
    ).toBeInTheDocument();

    // Verify no questions were saved to form-builder-questions
    const calls = vi.mocked(saveActivityResponse).mock.calls;
    const builderCall = calls.find((c) => c[3] === 'form-builder-questions');
    expect(builderCall).toBeUndefined();

    // Clicking "Enter Manually" navigates to /design?step=form-builder
    const enterManuallyBtn = screen.getByRole('button', { name: /enter manually/i });
    fireEvent.click(enterManuallyBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/design?step=form-builder');
  });
});
