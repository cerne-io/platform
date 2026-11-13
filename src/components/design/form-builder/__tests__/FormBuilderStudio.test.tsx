import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormBuilderStudio } from '../FormBuilderStudio';
import { aiAssistantService } from '@/services/aiAssistantService';
import { generateWithAI } from '@/hooks/slider-questions/sliderQuestionAIGenerator';
import { saveStoryQuestionWithSync } from '@/services/sync/storyQuestionSyncService';
import { saveSliderQuestionsWithSync } from '@/services/sync/sliderQuestionsSyncService';
import { saveParticipantQuestionsWithSync } from '@/services/sync/participantQuestionsSyncService';
import { saveQuestionType } from '@/services/formConfig/questionTypeService';
import { saveActivityResponse } from '@/services/supabaseSync/operations/save/saveActivityResponse';

const mockInvalidateDesign = vi.fn();
vi.mock('@/hooks/mutations/useInvalidateDesign', () => ({
  useInvalidateDesign: () => mockInvalidateDesign,
}));

vi.mock('@/services/sync/storyQuestionSyncService', () => ({
  saveStoryQuestionWithSync: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/services/sync/sliderQuestionsSyncService', () => ({
  saveSliderQuestionsWithSync: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/services/sync/triangleQuestionsSyncService', () => ({
  saveTriangleQuestionsWithSync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/sync/participantQuestionsSyncService', () => ({
  saveParticipantQuestionsWithSync: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/services/formConfig/questionTypeService', () => ({
  saveQuestionType: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/services/supabaseSync/operations/save/saveActivityResponse', () => ({
  saveActivityResponse: vi.fn().mockResolvedValue({ id: 'mock-resp' }),
}));

vi.mock('@/services/factors/useInfluencingFactors', () => ({
  useInfluencingFactors: () => ({
    getInfluencingFactors: vi.fn().mockResolvedValue(['Trust', 'Autonomy']),
  }),
}));

vi.mock('@/hooks/slider-questions/sliderQuestionAIGenerator', () => ({
  generateWithAI: vi.fn(),
}));

vi.mock('@/services/validation/phaseValidationService', () => ({
  validateDesignPhasePrerequisites: vi.fn().mockResolvedValue({
    isValid: true,
    contextComplete: true,
    defineComplete: true,
    missingRequirements: [],
    completedRequirements: [],
    contextMissing: [],
    defineMissing: [],
    contextCompleted: [],
    defineCompleted: [],
  }),
}));

vi.mock('@/utils/project-context/prepareProjectContext', () => ({
  prepareProjectContext: vi.fn().mockResolvedValue({ context: 'Project context' }),
}));

vi.mock('@/services/aiAssistantService', () => ({
  aiAssistantService: {
    callAssistant: vi.fn(),
  },
}));

vi.mock('@/contexts/ProjectContext', () => ({
  useProject: () => ({
    activeProject: { id: 'test-project' },
    currentUserProjectRole: 'owner',
  }),
}));

vi.mock('@/services/formLanguageService', () => ({
  getProjectLanguages: vi.fn().mockResolvedValue({
    defaultLanguage: 'en',
    enabledLanguages: ['en'],
  }),
  DEFAULT_LANGUAGES: {
    defaultLanguage: 'en',
    enabledLanguages: ['en'],
  },
}));

vi.mock('@/hooks/queries/useFormDataQuery', () => ({
  useFormDataQuery: vi.fn().mockReturnValue({
    data: {
      formBuilderQuestions: [
        {
          id: 'q-1',
          type: 'story-question',
          label: 'Test Story Question',
          placeholder: 'Type here...',
          required: true,
        },
        {
          id: 'q-2',
          type: 'slider',
          label: 'Test Slider',
          sliderConfig: {
            leftLabel: 'Low',
            rightLabel: 'High',
            min: 0,
            max: 100,
            defaultValue: 50,
          },
        },
        {
          id: 'q-3',
          type: 'participant-questions',
          label: 'Test Participant Question',
          includePreferNotToSay: true,
          options: [
            { id: 'c1', label: 'Choice 1' },
            { id: 'c2', label: 'Choice 2' },
          ],
        },
        {
          id: 'q-4',
          type: 'multiple-choice',
          label: 'Test Multiple Choice',
          options: [
            { id: 'm1', label: 'Option A' },
            { id: 'm2', label: 'Option B' },
          ],
        },
      ],
    },
    isLoading: false,
  }),
  formDataQueryKey: () => ['formData'],
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      }),
    }),
  },
}));

describe('FormBuilderStudio', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it('arriving at form builder should not show a specific question chosen and Element Properties should be hidden', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <FormBuilderStudio projectId="test-project" />
      </QueryClientProvider>
    );

    // Questions should be rendered
    await waitFor(() => {
      expect(screen.getByText('Test Story Question')).toBeInTheDocument();
    });

    // "Element Properties" should NOT be visible on arrival
    expect(screen.queryByText('Element Properties')).not.toBeInTheDocument();

    // Clicking a question card opens "Element Properties"
    const questionCard = screen.getByText('Test Story Question');
    fireEvent.click(questionCard);

    expect(screen.getByText('Element Properties')).toBeInTheDocument();

    // Clicking the close button on Element Properties hides it again
    const buttons = screen.getAllByRole('button');
    const xButton = buttons.find((btn) => btn.querySelector('.lucide-x'));
    expect(xButton).toBeDefined();
    if (xButton) {
      fireEvent.click(xButton);
      expect(screen.queryByText('Element Properties')).not.toBeInTheDocument();
    }
  });

  it('shows Generate with AI on story question properties and opens the AI modal with Improve Your Question', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <FormBuilderStudio projectId="test-project" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Story Question')).toBeInTheDocument();
    });

    // Selecting Story Question shows Generate with AI and opens modal
    fireEvent.click(screen.getByText('Test Story Question'));
    const aiBtn = screen.getByRole('button', { name: /generate with ai/i });
    expect(aiBtn).toBeInTheDocument();

    fireEvent.click(aiBtn);
    expect(screen.getByText('Story Question AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Improve Your Question')).toBeInTheDocument();
    const regenBtn = screen.getByRole('button', { name: /re-generate with ai/i });
    expect(regenBtn).toBeInTheDocument();

    // Friendly error shown on AI failure
    vi.mocked(aiAssistantService.callAssistant).mockResolvedValueOnce({
      response: null,
      error: 'The AI service is temporarily unavailable. Please try again in a few moments.',
      errorCode: 'service_unavailable',
    });
    fireEvent.click(regenBtn);
    await waitFor(() => {
      expect(
        screen.getByText('The AI service is temporarily unavailable. Please try again in a few moments.')
      ).toBeInTheDocument();
    });

    // Generated question updates the question label on success
    vi.mocked(aiAssistantService.callAssistant).mockResolvedValueOnce({
      response: 'What moment best captures your team experience?',
      error: null,
      errorCode: null,
    });
    fireEvent.click(regenBtn);
    await waitFor(() => {
      expect(screen.getAllByText('What moment best captures your team experience?').length).toBeGreaterThan(0);
    });
  });

  it('generates 3 slider questions in the AI modal and can add all 3 to the form', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <FormBuilderStudio projectId="test-project" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Slider')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Slider'));
    fireEvent.click(screen.getByRole('button', { name: /generate with ai/i }));
    expect(screen.getByText('Slider Questions AI Assistant')).toBeInTheDocument();

    vi.mocked(generateWithAI).mockResolvedValueOnce([
      { id: 1, theme: 'Trust', question: 'Slider Q1?', leftLabel: 'Low 1', rightLabel: 'High 1', sliderValue: 50 },
      { id: 2, theme: 'Autonomy', question: 'Slider Q2?', leftLabel: 'Low 2', rightLabel: 'High 2', sliderValue: 50 },
      { id: 3, theme: 'Clarity', question: 'Slider Q3?', leftLabel: 'Low 3', rightLabel: 'High 3', sliderValue: 50 },
    ]);

    fireEvent.click(screen.getByRole('button', { name: /generate 3 questions/i }));

    await waitFor(() => {
      expect(screen.getByText('Slider Q1?')).toBeInTheDocument();
      expect(screen.getByText('Slider Q2?')).toBeInTheDocument();
      expect(screen.getByText('Slider Q3?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add all 3 to form/i }));

    await waitFor(() => {
      expect(screen.getByText('(6 elements)')).toBeInTheDocument();
    });
  });

  it('distinguishes Participant Question from Multiple Choice with its own pill, AI button, and persistent Prefer not to say toggle', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <FormBuilderStudio projectId="test-project" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Participant Question')).toBeInTheDocument();
    });

    // Participant Question shows its own pill
    expect(screen.getByText('Participant Question')).toBeInTheDocument();

    // Selecting Participant Question shows Generate with AI and Prefer not to say toggle
    fireEvent.click(screen.getByText('Test Participant Question'));
    expect(screen.getByRole('button', { name: /generate with ai/i })).toBeInTheDocument();

    const optOutSwitch = screen.getByRole('switch', { name: /include "prefer not to say"/i });
    expect(optOutSwitch).toHaveAttribute('data-state', 'checked');

    // Toggling off keeps the switch visible in the DOM
    fireEvent.click(optOutSwitch);
    expect(screen.getByRole('switch', { name: /include "prefer not to say"/i })).toHaveAttribute('data-state', 'unchecked');

    // Selecting generic Multiple Choice hides both Generate with AI and the Prefer not to say toggle
    fireEvent.click(screen.getByText('Test Multiple Choice'));
    expect(screen.queryByRole('button', { name: /generate with ai/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /include "prefer not to say"/i })).not.toBeInTheDocument();
  });

  it('clicking Save Form publishes questions to both authenticated and public forms/interviewers and purges edge cache', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <FormBuilderStudio projectId="test-project" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Story Question')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save form/i });
    expect(saveButton).toBeInTheDocument();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveStoryQuestionWithSync).toHaveBeenCalledWith('test-project', 'Test Story Question');
      expect(saveSliderQuestionsWithSync).toHaveBeenCalled();
      expect(saveParticipantQuestionsWithSync).toHaveBeenCalled();
      expect(saveQuestionType).toHaveBeenCalledWith('test-project', 'slider');
      expect(mockInvalidateDesign).toHaveBeenCalledWith('test-project');
    });

    // Also verifies that form-builder-questions was saved to both canonical and public-form locations
    expect(saveActivityResponse).toHaveBeenCalledWith(
      'test-project',
      'design',
      'form-builder',
      'form-builder-questions',
      expect.any(Array)
    );
    expect(saveActivityResponse).toHaveBeenCalledWith(
      'test-project',
      'collection',
      'public-form',
      'form-builder-questions',
      expect.any(Array)
    );
  });
});
