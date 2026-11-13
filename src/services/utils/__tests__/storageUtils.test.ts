import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearProjectStorage,
  getEffectiveProjectId,
  getSavedForkChoice,
  isForkDismissedForProject,
  persistForkChoice
} from '../storageUtils';

describe('Design Fork Persistence & Storage Integrity', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('clearProjectStorage preserves design-fork-choice', () => {
    const projectId = 'proj-123';
    
    // Set up project keys
    localStorage.setItem(`cerne_story_question_${projectId}`, 'some question');
    localStorage.setItem(`confetti-shown-${projectId}`, 'true');
    localStorage.setItem(`design-fork-choice-${projectId}`, 'story-question');

    // Run clearProjectStorage
    clearProjectStorage(projectId);

    // Ephemeral cache should be cleared
    expect(localStorage.getItem(`cerne_story_question_${projectId}`)).toBeNull();

    // Critical persistent preferences must NOT be cleared
    expect(localStorage.getItem(`confetti-shown-${projectId}`)).toBe('true');
    expect(localStorage.getItem(`design-fork-choice-${projectId}`)).toBe('story-question');
  });

  it('persistForkChoice stores choice strictly per project across localStorage and sessionStorage', () => {
    const projectId = 'proj-abc';
    persistForkChoice(projectId, 'organization');

    expect(localStorage.getItem(`design-fork-choice-${projectId}`)).toBe('organization');
    expect(sessionStorage.getItem(`design-fork-choice-${projectId}`)).toBe('organization');

    expect(getSavedForkChoice(projectId)).toBe('organization');
    expect(isForkDismissedForProject(projectId)).toBe(true);

    // Another project should NOT be dismissed
    expect(isForkDismissedForProject('proj-other')).toBe(false);
    expect(getSavedForkChoice('proj-other')).toBeNull();
  });

  it('isForkDismissedForProject does NOT rely on legacy global keys', () => {
    const projectId = 'proj-fresh';

    // Setting legacy global flag from the past should have NO effect
    localStorage.setItem('design-fork-choice', 'true');
    expect(isForkDismissedForProject(projectId)).toBe(false);

    // Only setting per-project flag dismisses it
    persistForkChoice(projectId, 'story-question');
    expect(isForkDismissedForProject(projectId)).toBe(true);
    expect(getSavedForkChoice(projectId)).toBe('story-question');
  });

  it('getEffectiveProjectId resolves from state or storage fallbacks', () => {
    expect(getEffectiveProjectId(null)).toBeNull();

    // From project object
    expect(getEffectiveProjectId({ id: 'proj-obj' })).toBe('proj-obj');

    // Fallback to activeProjectId
    localStorage.setItem('activeProjectId', 'proj-storage-id');
    expect(getEffectiveProjectId(null)).toBe('proj-storage-id');

    // Fallback to activeProject JSON
    localStorage.removeItem('activeProjectId');
    localStorage.setItem('activeProject', JSON.stringify({ id: 'proj-storage-json', name: 'Test' }));
    expect(getEffectiveProjectId(null)).toBe('proj-storage-json');
  });
});
