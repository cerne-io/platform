import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateDesignPhasePrerequisites, getPhaseNavigationInfo } from '../phaseValidationService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('phaseValidationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns invalid result immediately when projectId is missing', async () => {
    const result = await validateDesignPhasePrerequisites('');
    expect(result.isValid).toBe(false);
    expect(result.missingRequirements).toContain('Project ID is required');
  });

  it('handles database errors gracefully and surfaces error requirement', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: new Error('Database connection failed') }),
    });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as unknown as ReturnType<typeof supabase.from>);

    const result = await validateDesignPhasePrerequisites('proj-123');
    expect(result.isValid).toBe(false);
    expect(result.missingRequirements).toContain('Error validating prerequisites');
  });

  it('returns invalid when no activities are populated', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as unknown as ReturnType<typeof supabase.from>);

    const result = await validateDesignPhasePrerequisites('proj-123');
    expect(result.isValid).toBe(false);
    expect(result.contextComplete).toBe(false);
    expect(result.defineComplete).toBe(false);
    expect(result.missingRequirements.length).toBeGreaterThan(0);
  });

  it('validates successfully when all required context and define requirements have substantial content', async () => {
    const mockResponses = [
      // Context Phase
      { ar_phase_id: 'context', ar_step_id: 'organization', ar_activity_id: 'about', ar_response: 'Our organization is dedicated to community narrative inquiry.' },
      { ar_phase_id: 'context', ar_step_id: 'project', ar_activity_id: 'scope', ar_response: 'Project scope covers youth community programs in metropolitan areas.' },
      { ar_phase_id: 'context', ar_step_id: 'project', ar_activity_id: 'trigger', ar_response: 'Triggered by community interest in better narrative feedback systems.' },
      { ar_phase_id: 'context', ar_step_id: 'project', ar_activity_id: 'success', ar_response: 'Success entails gathering 500 distinct participant narratives.' },
      // Define Phase
      { ar_phase_id: 'define', ar_step_id: 'topic', ar_activity_id: 'investigate', ar_response: 'Investigating systemic workplace engagement factors and leadership.' },
      { ar_phase_id: 'define', ar_step_id: 'topic', ar_activity_id: 'focus', ar_response: 'Specific focus on junior employee retention during company restructuring.' },
      { ar_phase_id: 'define', ar_step_id: 'discover', ar_activity_id: 'factors', ar_response: 'Leadership communication, autonomy, compensation balance.' },
      { ar_phase_id: 'define', ar_step_id: 'discover', ar_activity_id: 'hopes', ar_response: 'Discovering actionable opportunities for better team onboarding.' },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockResponses, error: null }),
    });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as unknown as ReturnType<typeof supabase.from>);

    const result = await validateDesignPhasePrerequisites('proj-123');

    // Verification: exactly one query made to activity_responses
    expect(supabase.from).toHaveBeenCalledWith('activity_responses');
    expect(supabase.from).toHaveBeenCalledTimes(1);

    expect(result.contextComplete).toBe(true);
    expect(result.defineComplete).toBe(true);
    expect(result.isValid).toBe(true);
    expect(result.missingRequirements).not.toContain('Project Scope');
    expect(result.missingRequirements).not.toContain('Influencing Factors');
  });

  it('falls back to template_activity_responses when activity_responses is empty', async () => {
    const templateResponses = [
      { ar_phase_id: 'context', ar_step_id: 'organization', ar_activity_id: 'about', ar_response: 'Template organization background narrative details.' },
      { ar_phase_id: 'context', ar_step_id: 'project', ar_activity_id: 'scope', ar_response: 'Template project scope documentation with substantial text.' },
      { ar_phase_id: 'context', ar_step_id: 'project', ar_activity_id: 'trigger', ar_response: 'Template project trigger explanation with valid content.' },
      { ar_phase_id: 'context', ar_step_id: 'project', ar_activity_id: 'success', ar_response: 'Template project success criteria defined thoroughly.' },
      { ar_phase_id: 'define', ar_step_id: 'topic', ar_activity_id: 'investigate', ar_response: 'Template topic investigation notes and exploratory scope.' },
      { ar_phase_id: 'define', ar_step_id: 'topic', ar_activity_id: 'focus', ar_response: 'Template focus area analysis and boundary details.' },
      { ar_phase_id: 'define', ar_step_id: 'discover', ar_activity_id: 'factors', ar_response: 'Template factors influencing employee outcomes.' },
      { ar_phase_id: 'define', ar_step_id: 'discover', ar_activity_id: 'hopes', ar_response: 'Template hopes and expectations for discovery phase.' },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'activity_responses') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: templateResponses, error: null }),
        }),
      } as unknown as ReturnType<typeof supabase.from>;
    });

    const result = await validateDesignPhasePrerequisites('template-proj');

    expect(supabase.from).toHaveBeenCalledWith('activity_responses');
    expect(supabase.from).toHaveBeenCalledWith('template_activity_responses');
    expect(result.isValid).toBe(true);
  });

  it('filters out placeholder text (< 20 chars or containing placeholder phrases)', async () => {
    const placeholderResponses = [
      { ar_phase_id: 'context', ar_step_id: 'project', ar_activity_id: 'scope', ar_response: 'Short' },
      { ar_phase_id: 'context', ar_step_id: 'project', ar_activity_id: 'trigger', ar_response: 'Please enter your project trigger here' },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: placeholderResponses, error: null }),
    });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as unknown as ReturnType<typeof supabase.from>);

    const result = await validateDesignPhasePrerequisites('proj-placeholders');
    expect(result.contextComplete).toBe(false);
    expect(result.contextMissing).toContain('Project Scope');
    expect(result.contextMissing).toContain('Project Trigger');
  });

  it('provides navigation info for incomplete phases', () => {
    const nav = getPhaseNavigationInfo();
    expect(nav.context.route).toBe('/design?step=organization');
    expect(nav.define.route).toBe('/design?step=topic');
  });
});
