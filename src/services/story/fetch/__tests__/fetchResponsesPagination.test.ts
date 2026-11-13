import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { fetchSliderResponsesForProject } from '../fetchSliderResponses';
import { fetchParticipantResponsesForProject } from '../fetchParticipantResponses';
import { fetchTriangleResponsesForProject } from '../fetchTriangleResponses';
import { fetchStoriesForProject } from '../fetchStoriesForProject';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/utils/debugLogger', () => ({
  debugLog: vi.fn(),
  debugError: vi.fn(),
}));

describe('Response Fetchers Pagination and Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty-Array and Missing ID Semantics', () => {
    it('returns empty array immediately when projectId is missing', async () => {
      const sliderRes = await fetchSliderResponsesForProject('');
      const participantRes = await fetchParticipantResponsesForProject('');
      const triangleRes = await fetchTriangleResponsesForProject('');

      expect(sliderRes).toEqual([]);
      expect(participantRes).toEqual([]);
      expect(triangleRes).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('returns empty array immediately when storyIds is explicitly passed as [] (empty subset)', async () => {
      const sliderRes = await fetchSliderResponsesForProject('project-123', []);
      const participantRes = await fetchParticipantResponsesForProject('project-123', []);
      const triangleRes = await fetchTriangleResponsesForProject('project-123', []);

      expect(sliderRes).toEqual([]);
      expect(participantRes).toEqual([]);
      expect(triangleRes).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('Slider Responses Pagination (>1,000 rows)', () => {
    it('exhaustively paginates across multiple 1,000-row pages using stable id ASC ordering', async () => {
      // Mock page 1: 1,000 items
      const page1 = Array.from({ length: 1000 }, (_, i) => ({
        id: `slider-id-${i}`,
        story_id: `story-${Math.floor(i / 5)}`,
        question_id: (i % 5) + 1,
        question_text: `Question ${(i % 5) + 1}`,
        value: 50,
        response_type: 'answered',
        left_label: 'Low',
        right_label: 'High',
        created_at: new Date().toISOString(),
        sr_project_id: 'project-123',
      }));

      // Mock page 2: 250 items (total 1,250 rows)
      const page2 = Array.from({ length: 250 }, (_, i) => ({
        id: `slider-id-${1000 + i}`,
        story_id: `story-${Math.floor((1000 + i) / 5)}`,
        question_id: (i % 5) + 1,
        question_text: `Question ${(i % 5) + 1}`,
        value: 75,
        response_type: 'answered',
        left_label: 'Low',
        right_label: 'High',
        created_at: new Date().toISOString(),
        sr_project_id: 'project-123',
      }));

      let pageCallCount = 0;
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockImplementation((from: number, to: number) => {
          pageCallCount++;
          if (from === 0 && to === 999) {
            return Promise.resolve({ data: page1, error: null });
          }
          if (from === 1000 && to === 1999) {
            return Promise.resolve({ data: page2, error: null });
          }
          return Promise.resolve({ data: [], error: null });
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      const results = await fetchSliderResponsesForProject('project-123');

      expect(supabase.from).toHaveBeenCalledWith('slider_responses');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('sr_project_id', 'project-123');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('id', { ascending: true });
      expect(pageCallCount).toBe(2);
      expect(results.length).toBe(1250);
      expect(results[0].id).toBe('slider-id-0');
      expect(results[1249].id).toBe('slider-id-1249');
    });

    it('correctly chunks storyIds into batches of 100 and applies sr_project_id filter', async () => {
      // 150 stories requested -> 2 chunks (100 and 50)
      const storyIds = Array.from({ length: 150 }, (_, i) => `story-uuid-${i}`);

      const chunk1Data = [
        {
          id: 'resp-1',
          story_id: 'story-uuid-0',
          question_id: 1,
          question_text: 'Q1',
          value: 40,
          response_type: 'answered',
          left_label: 'L',
          right_label: 'R',
          created_at: new Date().toISOString(),
          sr_project_id: 'proj-xyz',
        },
      ];

      const chunk2Data = [
        {
          id: 'resp-2',
          story_id: 'story-uuid-120',
          question_id: 1,
          question_text: 'Q1',
          value: 80,
          response_type: 'answered',
          left_label: 'L',
          right_label: 'R',
          created_at: new Date().toISOString(),
          sr_project_id: 'proj-xyz',
        },
      ];

      let lastInBatch: string[] = [];
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        in: vi.fn().mockImplementation((col: string, ids: string[]) => {
          lastInBatch = ids;
          return mockQueryBuilder;
        }),
        range: vi.fn().mockImplementation(() => {
          if (lastInBatch.length === 100) {
            return Promise.resolve({ data: chunk1Data, error: null });
          }
          return Promise.resolve({ data: chunk2Data, error: null });
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      const results = await fetchSliderResponsesForProject('proj-xyz', storyIds);

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('sr_project_id', 'proj-xyz');
      expect(mockQueryBuilder.in).toHaveBeenCalledTimes(2);
      expect(results.length).toBe(2);
      expect(results.map(r => r.id)).toEqual(['resp-1', 'resp-2']);
    });

    it('handles an exact page multiple (e.g. exactly 2,000 rows across two 1,000-row pages followed by an empty 3rd page)', async () => {
      const page1 = Array.from({ length: 1000 }, (_, i) => ({
        id: `slider-exact-${i}`,
        story_id: `story-${i}`,
        question_id: 1,
        question_text: 'Q1',
        value: 50,
        response_type: 'answered',
        left_label: 'Low',
        right_label: 'High',
        created_at: new Date().toISOString(),
        sr_project_id: 'proj-exact',
      }));

      const page2 = Array.from({ length: 1000 }, (_, i) => ({
        id: `slider-exact-${1000 + i}`,
        story_id: `story-${1000 + i}`,
        question_id: 1,
        question_text: 'Q1',
        value: 60,
        response_type: 'answered',
        left_label: 'Low',
        right_label: 'High',
        created_at: new Date().toISOString(),
        sr_project_id: 'proj-exact',
      }));

      let rangeCalls = 0;
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockImplementation((from: number, to: number) => {
          rangeCalls++;
          if (from === 0 && to === 999) return Promise.resolve({ data: page1, error: null });
          if (from === 1000 && to === 1999) return Promise.resolve({ data: page2, error: null });
          if (from === 2000 && to === 2999) return Promise.resolve({ data: [], error: null });
          return Promise.resolve({ data: [], error: null });
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      const results = await fetchSliderResponsesForProject('proj-exact');

      expect(rangeCalls).toBe(3); // Page 1 (1000), Page 2 (1000), Page 3 (0 -> stop)
      expect(results.length).toBe(2000);
      expect(results[0].id).toBe('slider-exact-0');
      expect(results[1999].id).toBe('slider-exact-1999');
    });

    it('paginates multiple pages within a single story-ID batch', async () => {
      // 5 stories requested, but each story has 300 responses -> 1,500 rows total in a single batch
      const singleBatchStoryIds = ['story-1', 'story-2', 'story-3', 'story-4', 'story-5'];

      const page1 = Array.from({ length: 1000 }, (_, i) => ({
        id: `single-batch-${i}`,
        story_id: `story-${(i % 5) + 1}`,
        question_id: (i % 10) + 1,
        question_text: `Q${(i % 10) + 1}`,
        value: 50,
        response_type: 'answered',
        left_label: 'Low',
        right_label: 'High',
        created_at: new Date().toISOString(),
        sr_project_id: 'proj-single-batch',
      }));

      const page2 = Array.from({ length: 500 }, (_, i) => ({
        id: `single-batch-${1000 + i}`,
        story_id: `story-${(i % 5) + 1}`,
        question_id: (i % 10) + 1,
        question_text: `Q${(i % 10) + 1}`,
        value: 70,
        response_type: 'answered',
        left_label: 'Low',
        right_label: 'High',
        created_at: new Date().toISOString(),
        sr_project_id: 'proj-single-batch',
      }));

      let rangeCalls = 0;
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        range: vi.fn().mockImplementation((from: number, to: number) => {
          rangeCalls++;
          if (from === 0 && to === 999) return Promise.resolve({ data: page1, error: null });
          if (from === 1000 && to === 1999) return Promise.resolve({ data: page2, error: null });
          return Promise.resolve({ data: [], error: null });
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      const results = await fetchSliderResponsesForProject('proj-single-batch', singleBatchStoryIds);

      expect(mockQueryBuilder.in).toHaveBeenCalledWith('story_id', singleBatchStoryIds);
      expect(rangeCalls).toBe(2);
      expect(results.length).toBe(1500);
      expect(results[0].id).toBe('single-batch-0');
      expect(results[1499].id).toBe('single-batch-1499');
    });

    it('deduplicates incoming story IDs before chunking', async () => {
      // 120 story IDs provided, but only 3 unique IDs
      const duplicateStoryIds = [
        ...Array(40).fill('story-dup-1'),
        ...Array(40).fill('story-dup-2'),
        ...Array(40).fill('story-dup-3'),
      ];

      const mockData = [
        {
          id: 'resp-dup-1',
          story_id: 'story-dup-1',
          question_id: 1,
          question_text: 'Q1',
          value: 50,
          response_type: 'answered',
          left_label: 'L',
          right_label: 'R',
          created_at: new Date().toISOString(),
          sr_project_id: 'proj-dup',
        },
      ];

      const inMock = vi.fn().mockReturnThis();
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        in: inMock,
        range: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      const results = await fetchSliderResponsesForProject('proj-dup', duplicateStoryIds);

      // Should only send 1 batch with 3 unique IDs, not 2 chunks of 100 and 20 duplicates
      expect(inMock).toHaveBeenCalledTimes(1);
      expect(inMock).toHaveBeenCalledWith('story_id', ['story-dup-1', 'story-dup-2', 'story-dup-3']);
      expect(results.length).toBe(1);
    });

    it('rejects the entire fetch when a page request fails (error propagation)', async () => {
      const page1 = Array.from({ length: 1000 }, (_, i) => ({
        id: `slider-fail-${i}`,
        story_id: `story-${i}`,
        question_id: 1,
        question_text: 'Q1',
        value: 50,
        response_type: 'answered',
        left_label: 'Low',
        right_label: 'High',
        created_at: new Date().toISOString(),
        sr_project_id: 'proj-fail',
      }));

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockImplementation((from: number) => {
          if (from === 0) return Promise.resolve({ data: page1, error: null });
          // Page 2 fails with network/DB error
          return Promise.resolve({ data: null, error: new Error('PostgREST connection reset') });
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      // Must reject rather than returning the 1000 partial rows from page 1
      await expect(fetchSliderResponsesForProject('proj-fail')).rejects.toThrow('PostgREST connection reset');
    });
  });

  describe('Participant and Triangle Responses Verified Column Filtering', () => {
    it('filters participant_responses by pr_project_id', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'p-1',
              story_id: 's-1',
              question_id: 'pq-1',
              question_text: 'Role',
              response: 'Engineer',
              created_at: new Date().toISOString(),
              pr_project_id: 'proj-abc',
            },
          ],
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      const results = await fetchParticipantResponsesForProject('proj-abc');

      expect(supabase.from).toHaveBeenCalledWith('participant_responses');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('pr_project_id', 'proj-abc');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('id', { ascending: true });
      expect(results.length).toBe(1);
    });

    it('filters triangle_responses by tr_project_id', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [
            {
              id: 't-1',
              story_id: 's-1',
              question_id: 1,
              question_text: 'Tradeoffs',
              x_position: 0.33,
              y_position: 0.33,
              response_type: 'answered',
              top_label: 'Speed',
              bottom_left_label: 'Cost',
              bottom_right_label: 'Quality',
              created_at: new Date().toISOString(),
              tr_project_id: 'proj-abc',
            },
          ],
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      const results = await fetchTriangleResponsesForProject('proj-abc');

      expect(supabase.from).toHaveBeenCalledWith('triangle_responses');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('tr_project_id', 'proj-abc');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('id', { ascending: true });
      expect(results.length).toBe(1);
    });
  });

  describe('Stories Pagination (>1,000 rows)', () => {
    it('paginates stories beyond 1,000 rows when limit is omitted', async () => {
      const page1 = Array.from({ length: 1000 }, (_, i) => ({
        id: `story-${i}`,
        title: `Title ${i}`,
        text: `Body ${i}`,
        emotional_response: 'calm',
        feeling_sentiment: 'neutral',
        created_at: new Date().toISOString(),
        st_project_id: 'proj-big',
      }));
      const page2 = Array.from({ length: 5 }, (_, i) => ({
        id: `story-${1000 + i}`,
        title: `Title ${1000 + i}`,
        text: `Body ${1000 + i}`,
        emotional_response: 'calm',
        feeling_sentiment: 'neutral',
        created_at: new Date().toISOString(),
        st_project_id: 'proj-big',
      }));

      const storiesBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockImplementation((from: number) =>
          Promise.resolve({ data: from === 0 ? page1 : page2, error: null })
        ),
      };
      const emptyResponsesBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      vi.mocked(supabase.from).mockImplementation((table: string) =>
        (table === 'stories' ? storiesBuilder : emptyResponsesBuilder) as unknown as ReturnType<typeof supabase.from>
      );

      const stories = await fetchStoriesForProject('proj-big');
      expect(stories).toHaveLength(1005);
      expect(stories[1004].id).toBe('story-1004');
    });
  });
});
