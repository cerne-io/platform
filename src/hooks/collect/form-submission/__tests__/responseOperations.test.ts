import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveSliderResponses } from '../sliderResponseOperations';
import { saveTriangleResponses } from '../triangleResponseOperations';
import { saveParticipantData } from '../participantResponseOperations';
import { submitPublicForm } from '../publicSubmissionHandler';
import { submitAuthenticatedForm } from '../authenticatedSubmissionHandler';
import { StoryData } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { supabasePublic } from '@/integrations/supabase/publicClient';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
    },
  },
}));

vi.mock('@/integrations/supabase/publicClient', () => ({
  supabasePublic: {
    from: vi.fn(),
  },
}));

describe('Secondary Response Operations - Boolean Contract & Failure Containment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveSliderResponses', () => {
    it('returns true when there are no slider responses', async () => {
      const formData: StoryData = {
        title: 'Title',
        text: 'Narrative',
        emotionalResponse: 'Positive',
        projectId: 'project-123',
        sliderResponses: [],
      };

      const result = await saveSliderResponses(formData, 'story-123');
      expect(result).toBe(true);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('returns true when all slider writes succeed', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null });
      vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as unknown as ReturnType<typeof supabase.from>);

      const formData: StoryData = {
        title: 'Title',
        text: 'Narrative',
        emotionalResponse: 'Positive',
        projectId: 'project-123',
        sliderResponses: [
          { questionId: 1, questionText: 'Q1', value: 50, responseType: 'slider', leftLabel: 'L', rightLabel: 'R' },
          { questionId: 2, questionText: 'Q2', value: 75, responseType: 'slider', leftLabel: 'L', rightLabel: 'R' },
        ],
      };

      const result = await saveSliderResponses(formData, 'story-123');
      expect(result).toBe(true);
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    it('returns false when database returns an error', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error', code: '42501' } });
      vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as unknown as ReturnType<typeof supabase.from>);

      const formData: StoryData = {
        title: 'Title',
        text: 'Narrative',
        emotionalResponse: 'Positive',
        projectId: 'project-123',
        sliderResponses: [
          { questionId: 1, questionText: 'Q1', value: 50, responseType: 'slider', leftLabel: 'L', rightLabel: 'R' },
          { questionId: 2, questionText: 'Q2', value: 75, responseType: 'slider', leftLabel: 'L', rightLabel: 'R' },
        ],
      };

      const result = await saveSliderResponses(formData, 'story-123');
      expect(result).toBe(false);
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    it('returns false when insert rejects', async () => {
      const mockInsert = vi.fn().mockRejectedValue(new Error('Network drop'));
      vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as unknown as ReturnType<typeof supabase.from>);

      const formData: StoryData = {
        title: 'Title',
        text: 'Narrative',
        emotionalResponse: 'Positive',
        projectId: 'project-123',
        sliderResponses: [
          { questionId: 1, questionText: 'Q1', value: 50, responseType: 'slider', leftLabel: 'L', rightLabel: 'R' },
          { questionId: 2, questionText: 'Q2', value: 75, responseType: 'slider', leftLabel: 'L', rightLabel: 'R' },
        ],
      };

      const result = await saveSliderResponses(formData, 'story-123');
      expect(result).toBe(false);
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveTriangleResponses', () => {
    it('returns true when there are no triangle responses', async () => {
      const formData: StoryData = {
        title: 'Title',
        text: 'Narrative',
        emotionalResponse: 'Positive',
        projectId: 'project-123',
        triangleResponses: [],
      };

      const result = await saveTriangleResponses(formData, 'story-123');
      expect(result).toBe(true);
    });

    it('returns false on failure', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
      vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as unknown as ReturnType<typeof supabase.from>);

      const formData: StoryData = {
        title: 'Title',
        text: 'Narrative',
        emotionalResponse: 'Positive',
        projectId: 'project-123',
        triangleResponses: [{ questionId: 1, questionText: 'Tri', xPosition: 30, yPosition: 40, responseType: 'triangle', topLabel: 'T', bottomLeftLabel: 'BL', bottomRightLabel: 'BR' }],
      };

      const result = await saveTriangleResponses(formData, 'story-123');
      expect(result).toBe(false);
    });

    it('saves imported triangle responses that use default placeholder question text', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null });
      vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as unknown as ReturnType<typeof supabase.from>);

      const formData: StoryData = {
        title: 'Title',
        text: 'Narrative',
        emotionalResponse: 'Positive',
        projectId: 'project-123',
        triangleResponses: [{ questionId: 1, questionText: 'Triangle Question 1', xPosition: 30, yPosition: 40, responseType: 'answered', topLabel: 'T', bottomLeftLabel: 'BL', bottomRightLabel: 'BR' }],
      };

      const result = await saveTriangleResponses(formData, 'story-123');
      expect(result).toBe(true);
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveParticipantData', () => {
    it('returns true when there are no participant responses', async () => {
      const formData: StoryData = {
        title: 'Title',
        text: 'Narrative',
        emotionalResponse: 'Positive',
        projectId: 'project-123',
        participantResponses: [],
      };

      const result = await saveParticipantData(formData, 'story-123');
      expect(result).toBe(true);
    });

    it('returns false on failure', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
      vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as unknown as ReturnType<typeof supabase.from>);

      const formData: StoryData = {
        title: 'Title',
        text: 'Narrative',
        emotionalResponse: 'Positive',
        projectId: 'project-123',
        participantResponses: [{ questionId: 'demog_1', questionText: 'Dept', choiceText: 'Engineering' }],
      };

      const result = await saveParticipantData(formData, 'story-123');
      expect(result).toBe(false);
    });
  });

  describe('Public Submission Flow - Transactional Endpoint', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns false when /api/public/submit-story fails to prevent silent data loss', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Insert failed' }), { status: 400 })
      );
      vi.stubGlobal('fetch', fetchMock);

      const formData: StoryData = {
        formId: 'public-form-123',
        title: 'A Story',
        text: 'The narrative text was submitted',
        emotionalResponse: 'Neutral',
        projectId: 'project-123',
        sliderResponses: [{ questionId: 1, questionText: 'Q1', value: 50, responseType: 'answered', leftLabel: 'L', rightLabel: 'R' }],
        triangleResponses: [{ questionId: 1, questionText: 'Tri', xPosition: 20, yPosition: 30, responseType: 'answered', topLabel: 'T', bottomLeftLabel: 'BL', bottomRightLabel: 'BR' }],
        participantResponses: [{ questionId: 'd1', questionText: 'Age', choiceId: 'c1', choiceText: '30-39' }],
      };

      const submissionResult = await submitPublicForm(formData);
      expect(submissionResult).toBe(false);
      expect(fetchMock).toHaveBeenCalledWith('/api/public/submit-story', expect.objectContaining({ method: 'POST' }));
    });

    it('submits atomically through /api/public/submit-story without using admin or direct table writes', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ storyId: 'story-1', projectId: 'project-123' }), { status: 201 })
      );
      vi.stubGlobal('fetch', fetchMock);

      const formData: StoryData = {
        formId: 'public-form-123',
        title: 'Public Audio Story',
        text: '[Audio Recording - Transcription Pending]',
        emotionalResponse: 'Neutral',
        projectId: 'project-123',
        sliderResponses: [{ questionId: 1, questionText: 'Q1', value: 50, responseType: 'answered', leftLabel: 'L', rightLabel: 'R' }],
        triangleResponses: [{ questionId: 1, questionText: 'Tri', xPosition: 20, yPosition: 30, responseType: 'answered', topLabel: 'T', bottomLeftLabel: 'BL', bottomRightLabel: 'BR' }],
        participantResponses: [{ questionId: 'd1', questionText: 'Age', choiceId: 'c1', choiceText: '30-39' }],
      };

      const submissionResult = await submitPublicForm(formData);
      expect(submissionResult).toBe(true);
      expect(supabasePublic.from).not.toHaveBeenCalled();
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('Authenticated vs Public created_at key handling', () => {
    it('omits created_at key when isPublic is undefined or false so PostgREST uses DB default instead of NULL', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null });
      vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as unknown as ReturnType<typeof supabase.from>);

      const formData: StoryData = {
        title: 'Authenticated Story',
        text: 'Narrative',
        emotionalResponse: 'Positive',
        projectId: 'project-123',
        // isPublic omitted to match authenticated /interviewer (convertToStoryData)
        sliderResponses: [{ questionId: 1, questionText: 'Q1', value: 50, responseType: 'answered', leftLabel: 'L', rightLabel: 'R' }],
        triangleResponses: [{ questionId: 1, questionText: 'Tri', xPosition: 20, yPosition: 30, responseType: 'answered', topLabel: 'T', bottomLeftLabel: 'BL', bottomRightLabel: 'BR' }],
        participantResponses: [{ questionId: 'd1', questionText: 'Age', choiceId: 'c1', choiceText: '30-39' }],
      };

      await saveSliderResponses(formData, 'story-123');
      await saveTriangleResponses(formData, 'story-123');
      await saveParticipantData(formData, 'story-123');

      expect(mockInsert).toHaveBeenCalledTimes(3);
      for (const call of mockInsert.mock.calls) {
        const rows = call[0] as Record<string, unknown>[];
        for (const row of rows) {
          expect(Object.keys(row)).not.toContain('created_at');
        }
      }
    });

    it('submits authenticated stories atomically via /api/db/submit-story and returns false on failure', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: '23502 not-null violation' }), { status: 400 })
      );
      vi.stubGlobal('fetch', fetchMock);

      const formData: StoryData = {
        title: 'Authenticated Story',
        text: 'Narrative',
        emotionalResponse: 'Positive',
        projectId: '11111111-1111-1111-1111-111111111111',
        participantResponses: [{ questionId: 'd1', questionText: 'Age', choiceId: 'c1', choiceText: '30-39' }],
      };

      const result = await submitAuthenticatedForm(formData);
      expect(result).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe('/api/db/submit-story');
    });
  });
});
