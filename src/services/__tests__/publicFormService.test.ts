import { describe, it, expect, vi } from 'vitest';
import { parseFormConfigRows, type ActivityResponseRow } from '../publicFormService';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn() },
}));

describe('parseFormConfigRows', () => {
  it('extracts custom headerText and subheaderText from form-appearance-editor row', async () => {
    const rows: ActivityResponseRow[] = [
      {
        id: 'row-1',
        ar_project_id: 'proj-1',
        ar_phase_id: 'build',
        ar_step_id: 'form-appearance',
        ar_activity_id: 'form-appearance-editor',
        ar_response: {
          headerText: { en: 'Share Your Voice', es: 'Comparte tu voz' },
          subheaderText: 'Tell us what happened',
        },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ];

    const result = await parseFormConfigRows(rows, 'proj-1');

    expect(result?.headerText).toEqual({ en: 'Share Your Voice', es: 'Comparte tu voz' });
    expect(result?.subheaderText).toBe('Tell us what happened');
  });

  it('picks the newest form-appearance-editor row by created_at when multiple exist', async () => {
    const rows: ActivityResponseRow[] = [
      {
        id: 'old-row',
        ar_project_id: 'proj-1',
        ar_phase_id: 'collection',
        ar_step_id: 'form-appearance',
        ar_activity_id: 'form-appearance-editor',
        ar_response: { headerText: 'Old Header', subheaderText: 'Old Subheader' },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'new-row',
        ar_project_id: 'proj-1',
        ar_phase_id: 'build',
        ar_step_id: 'form-appearance',
        ar_activity_id: 'form-appearance-editor',
        ar_response: { headerText: 'New Header', subheaderText: 'New Subheader' },
        created_at: '2026-02-01T00:00:00Z',
        updated_at: '2026-02-01T00:00:00Z',
      },
    ];

    const result = await parseFormConfigRows(rows, 'proj-1');

    expect(result?.headerText).toBe('New Header');
    expect(result?.subheaderText).toBe('New Subheader');
  });

  it('leaves headerText and subheaderText undefined when appearance row is absent', async () => {
    const result = await parseFormConfigRows([], 'proj-1');

    expect(result?.headerText).toBeUndefined();
    expect(result?.subheaderText).toBeUndefined();
  });
});

