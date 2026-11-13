import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStoryImport } from '../useStoryImport';
import * as sliderOps from '../collect/form-submission/sliderResponseOperations';
import * as triangleOps from '../collect/form-submission/triangleResponseOperations';
import * as participantOps from '../collect/form-submission/participantResponseOperations';
import * as storyOps from '../collect/form-submission/storyOperations';
import * as csvImportUtils from '@/utils/story/csvImportUtils';
import { useToast } from '@/components/ui/use-toast';
import { useProject } from '@/contexts/ProjectContext';

vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn(),
}));

vi.mock('@/contexts/ProjectContext', () => ({
  useProject: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      }),
    }),
  },
}));

vi.mock('../collect/form-submission/storyOperations', () => ({
  saveStory: vi.fn(),
}));

vi.mock('../collect/form-submission/sliderResponseOperations', () => ({
  saveSliderResponses: vi.fn(),
}));

vi.mock('../collect/form-submission/triangleResponseOperations', () => ({
  saveTriangleResponses: vi.fn(),
}));

vi.mock('../collect/form-submission/participantResponseOperations', () => ({
  saveParticipantData: vi.fn(),
}));

vi.mock('@/utils/story/csvImportUtils', () => ({
  parseCSVFile: vi.fn(),
  isCSVFile: vi.fn().mockReturnValue(true),
  convertCSVToStories: vi.fn(),
}));

describe('useStoryImport - Partial Error Accounting and Summary Wording', () => {
  const mockToast = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as unknown as ReturnType<typeof useToast>);
    vi.mocked(useProject).mockReturnValue({
      activeProject: { id: 'project-123', user_id: 'user-1' },
      currentUserProjectRole: 'owner',
    } as unknown as ReturnType<typeof useProject>);
  });

  it('increments partialErrorCount at most once per successfully imported story when multiple categories fail', async () => {
    vi.mocked(storyOps.saveStory).mockResolvedValue('story-uuid-1');
    // Both slider and triangle fail for this story
    vi.mocked(sliderOps.saveSliderResponses).mockResolvedValue(false);
    vi.mocked(triangleOps.saveTriangleResponses).mockResolvedValue(false);
    vi.mocked(participantOps.saveParticipantData).mockResolvedValue(true);

    vi.mocked(csvImportUtils.parseCSVFile).mockResolvedValue([['dummy']] as unknown as Record<string, unknown>[]);
    vi.mocked(csvImportUtils.convertCSVToStories).mockReturnValue([
      {
        title: 'Story 1',
        text: 'Narrative text',
        sliderResponses: [{ question_id: 1, value: 50 }],
        triangleResponses: [{ question_id: 2, x_position: 10, y_position: 20 }],
        participantResponses: [],
      },
    ]);

    const { result } = renderHook(() => useStoryImport(mockOnSuccess));
    const dummyFile = new File(['csv content'], 'stories.csv', { type: 'text/csv' });

    await act(async () => {
      await result.current.importFile(dummyFile);
    });

    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Import completed with warnings',
        description: 'Imported 1 stories. Question responses could not be fully saved for 1 stories.',
        variant: 'destructive',
      })
    );
  });

  it('accurately reports mixed primary failures and secondary response errors', async () => {
    // Story 1: succeeds with partial response failure
    // Story 2: fails primary save
    vi.mocked(storyOps.saveStory)
      .mockResolvedValueOnce('story-uuid-1')
      .mockResolvedValueOnce(null as unknown as string); // primary failure

    vi.mocked(sliderOps.saveSliderResponses).mockResolvedValue(false);
    vi.mocked(triangleOps.saveTriangleResponses).mockResolvedValue(true);
    vi.mocked(participantOps.saveParticipantData).mockResolvedValue(true);

    vi.mocked(csvImportUtils.parseCSVFile).mockResolvedValue([['dummy']] as unknown as Record<string, unknown>[]);
    vi.mocked(csvImportUtils.convertCSVToStories).mockReturnValue([
      {
        title: 'Story 1',
        text: 'Text 1',
        sliderResponses: [{ question_id: 1, value: 50 }],
      },
      {
        title: 'Story 2',
        text: 'Text 2',
        sliderResponses: [{ question_id: 1, value: 50 }],
      },
    ]);

    const { result } = renderHook(() => useStoryImport(mockOnSuccess));
    const dummyFile = new File(['csv content'], 'stories.csv', { type: 'text/csv' });

    await act(async () => {
      await result.current.importFile(dummyFile);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Import completed with warnings',
        description: 'Imported 1 stories; 1 stories failed to import. Question responses could not be fully saved for 1 imported stories.',
        variant: 'destructive',
      })
    );
  });

  it('reports standard success when all stories and secondary responses succeed', async () => {
    vi.mocked(storyOps.saveStory).mockResolvedValue('story-uuid-1');
    vi.mocked(sliderOps.saveSliderResponses).mockResolvedValue(true);
    vi.mocked(triangleOps.saveTriangleResponses).mockResolvedValue(true);
    vi.mocked(participantOps.saveParticipantData).mockResolvedValue(true);

    vi.mocked(csvImportUtils.parseCSVFile).mockResolvedValue([['dummy']] as unknown as Record<string, unknown>[]);
    vi.mocked(csvImportUtils.convertCSVToStories).mockReturnValue([
      {
        title: 'Story 1',
        text: 'Text 1',
        sliderResponses: [{ question_id: 1, value: 50 }],
      },
    ]);

    const { result } = renderHook(() => useStoryImport(mockOnSuccess));
    const dummyFile = new File(['csv content'], 'stories.csv', { type: 'text/csv' });

    await act(async () => {
      await result.current.importFile(dummyFile);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Import completed',
        description: 'Successfully imported 1 stories with their responses.',
        variant: 'default',
      })
    );
  });

  it('denies import and shows permission denied toast when user is not owner', async () => {
    vi.mocked(useProject).mockReturnValue({
      activeProject: { id: 'project-123', user_id: 'other-user' },
      currentUserProjectRole: 'editor',
    } as unknown as ReturnType<typeof useProject>);

    const { result } = renderHook(() => useStoryImport(mockOnSuccess));
    const dummyFile = new File(['csv content'], 'stories.csv', { type: 'text/csv' });

    await act(async () => {
      await result.current.importFile(dummyFile);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Permission denied',
        description: 'Only the project owner can import stories.',
        variant: 'destructive',
      })
    );
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(storyOps.saveStory).not.toHaveBeenCalled();
  });

  it('imports into draft projects without a 15-story cap or get_user_roles RPC', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(useProject).mockReturnValue({
      activeProject: { id: 'draft-proj-1', user_id: 'user-1', is_active: false },
      currentUserProjectRole: 'owner',
    } as unknown as ReturnType<typeof useProject>);
    vi.mocked(storyOps.saveStory).mockResolvedValue('story-uuid-16');

    vi.mocked(csvImportUtils.parseCSVFile).mockResolvedValue([['dummy']] as unknown as Record<string, unknown>[]);
    vi.mocked(csvImportUtils.convertCSVToStories).mockReturnValue([
      { title: 'Story 16', text: 'Allowed in OSS' },
    ]);

    const { result } = renderHook(() => useStoryImport(mockOnSuccess));
    const dummyFile = new File(['csv content'], 'stories.csv', { type: 'text/csv' });

    await act(async () => {
      await result.current.importFile(dummyFile);
    });

    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(storyOps.saveStory).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Import completed',
        variant: 'default',
      })
    );
  });
});
