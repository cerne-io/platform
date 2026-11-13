import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateParticipantQuestionsWithAI } from '../participantQuestionGenerator';
import { aiAssistantService } from '@/services/aiAssistantService';
import { prepareProjectContext } from '@/utils/project-context/prepareProjectContext';
import { Project } from '@/types/project';

vi.mock('@/services/aiAssistantService', () => ({
  aiAssistantService: {
    callAssistant: vi.fn(),
  },
}));

vi.mock('@/utils/project-context/prepareProjectContext', () => ({
  prepareProjectContext: vi.fn(),
}));

describe('participantQuestionGenerator', () => {
  const mockProject: Project = {
    id: 'proj-123',
    name: 'Healthcare Safety Culture',
    description: 'Exploring staff safety voices',
    is_active: true,
    is_template: false,
    is_event_mode: false,
    activated_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null if no project or projectId is provided', async () => {
    const result = await generateParticipantQuestionsWithAI(null);
    expect(result).toBeNull();
  });

  it('generates and parses 2-3 participant questions and choices correctly', async () => {
    vi.mocked(prepareProjectContext).mockResolvedValue({
      context: 'Project context text',
    });

    const mockAiResponse = JSON.stringify([
      {
        label: 'Clinical Role',
        choices: ['Physician', 'Registered Nurse', 'Allied Health', 'Administrative'],
      },
      {
        label: 'Primary Work Setting',
        choices: ['Inpatient Unit', 'Emergency Department', 'Outpatient Clinic'],
      },
    ]);

    vi.mocked(aiAssistantService.callAssistant).mockResolvedValue({
      response: mockAiResponse,
      error: null,
      errorCode: null,
    });

    const questions = await generateParticipantQuestionsWithAI(mockProject);

    expect(questions).not.toBeNull();
    expect(questions).toHaveLength(2);
    expect(questions![0].label).toBe('Clinical Role');
    expect(questions![0].choices).toHaveLength(4);
    expect(questions![0].choices[0].label).toBe('Physician');
    expect(questions![1].label).toBe('Primary Work Setting');
    expect(questions![1].choices).toHaveLength(3);
  });

  it('cleans markdown-wrapped json blocks correctly', async () => {
    vi.mocked(prepareProjectContext).mockResolvedValue({
      context: 'Context data',
    });

    const markdownAiResponse = `\`\`\`json
[
  {
    "label": "Tenure",
    "choices": ["<1 year", "1-3 years", "3+ years"]
  }
]
\`\`\``;

    vi.mocked(aiAssistantService.callAssistant).mockResolvedValue({
      response: markdownAiResponse,
      error: null,
      errorCode: null,
    });

    const questions = await generateParticipantQuestionsWithAI(mockProject);

    expect(questions).not.toBeNull();
    expect(questions).toHaveLength(1);
    expect(questions![0].label).toBe('Tenure');
    expect(questions![0].choices[0].label).toBe('<1 year');
  });

  it('handles conversational preamble before markdown code block', async () => {
    vi.mocked(prepareProjectContext).mockResolvedValue({
      context: 'Context data',
    });

    const responseWithPreamble = `Here are the questions:
\`\`\`json
[
  {
    "label": "Shift",
    "choices": ["Day", "Night", "Rotating"]
  }
]
\`\`\`
Hope this helps!`;

    vi.mocked(aiAssistantService.callAssistant).mockResolvedValue({
      response: responseWithPreamble,
      error: null,
      errorCode: null,
    });

    const questions = await generateParticipantQuestionsWithAI(mockProject);
    expect(questions).not.toBeNull();
    expect(questions).toHaveLength(1);
    expect(questions![0].label).toBe('Shift');
    expect(questions![0].choices[0].label).toBe('Day');
  });

  it('returns null safely on invalid json response', async () => {
    vi.mocked(prepareProjectContext).mockResolvedValue({
      context: 'Context data',
    });

    vi.mocked(aiAssistantService.callAssistant).mockResolvedValue({
      response: 'Not a valid json string',
      error: null,
      errorCode: null,
    });

    const questions = await generateParticipantQuestionsWithAI(mockProject);
    expect(questions).toBeNull();
  });
});
