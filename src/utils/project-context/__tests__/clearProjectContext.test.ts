import { describe, it, expect, beforeEach } from 'vitest';
import { clearProjectContext } from '../clearProjectContext';

describe('clearProjectContext Key Cleanup Integrity', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('removes ALL consecutive matching sessionStorage keys without index-skipping', async () => {
    const projectId = 'proj-999';

    // Populate consecutive keys that match the filter
    sessionStorage.setItem(`project_context_${projectId}`, 'val1');
    sessionStorage.setItem(`project_context_extra_${projectId}`, 'val2');
    sessionStorage.setItem(`session_${projectId}_temp1`, 'val3');
    sessionStorage.setItem(`session_${projectId}_temp2`, 'val4');
    sessionStorage.setItem('unrelated_session_key', 'keep_me');

    // Populate consecutive ar_cache_ keys
    sessionStorage.setItem('ar_cache_activity_1', 'cached1');
    sessionStorage.setItem('ar_cache_activity_2', 'cached2');
    sessionStorage.setItem('ar_cache_activity_3', 'cached3');

    // Also populate localStorage keys
    localStorage.setItem(`form_data_${projectId}`, 'data');
    localStorage.setItem('unrelated_local_key', 'keep_me_too');

    await clearProjectContext(projectId);

    // All matching project keys in sessionStorage must be completely removed
    expect(sessionStorage.getItem(`project_context_${projectId}`)).toBeNull();
    expect(sessionStorage.getItem(`project_context_extra_${projectId}`)).toBeNull();
    expect(sessionStorage.getItem(`session_${projectId}_temp1`)).toBeNull();
    expect(sessionStorage.getItem(`session_${projectId}_temp2`)).toBeNull();

    // All ar_cache_ keys must be removed
    expect(sessionStorage.getItem('ar_cache_activity_1')).toBeNull();
    expect(sessionStorage.getItem('ar_cache_activity_2')).toBeNull();
    expect(sessionStorage.getItem('ar_cache_activity_3')).toBeNull();

    // Unrelated keys must remain intact
    expect(sessionStorage.getItem('unrelated_session_key')).toBe('keep_me');
    expect(localStorage.getItem('unrelated_local_key')).toBe('keep_me_too');
  });

  it('handles empty or non-existent project id gracefully', async () => {
    await clearProjectContext('');
    // Should not throw and exit cleanly
    expect(true).toBe(true);
  });
});
