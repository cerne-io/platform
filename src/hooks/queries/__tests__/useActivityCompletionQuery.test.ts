import { describe, it, expect } from 'vitest';
import { isActivityDataNonEmpty } from '../useActivityCompletionQuery';

describe('isActivityDataNonEmpty', () => {
  it('rejects null and undefined', () => {
    expect(isActivityDataNonEmpty('story-questions', null)).toBe(false);
    expect(isActivityDataNonEmpty('story-questions', undefined)).toBe(false);
  });

  it('rejects empty strings and whitespace', () => {
    expect(isActivityDataNonEmpty('story-questions', '')).toBe(false);
    expect(isActivityDataNonEmpty('story-questions', '   ')).toBe(false);
  });

  it('accepts non-empty strings', () => {
    expect(isActivityDataNonEmpty('story-questions', 'Tell us your story')).toBe(true);
  });

  it('rejects empty arrays and accepts populated arrays', () => {
    expect(isActivityDataNonEmpty('slider-questions', [])).toBe(false);
    expect(isActivityDataNonEmpty('slider-questions', [{ id: 1, question: 'Rate your experience' }])).toBe(true);
  });

  it('evaluates participant questions object with empty questions array as false', () => {
    expect(isActivityDataNonEmpty('participant-questions', { questions: [], includePreferNotToSay: false })).toBe(false);
    expect(isActivityDataNonEmpty('participant-questions', {
      questions: [{ id: 'p1', label: 'Age group' }],
      includePreferNotToSay: true,
    })).toBe(true);
  });

  it('evaluates story questions object with empty or populated string', () => {
    expect(isActivityDataNonEmpty('story-questions', { story_question: '' })).toBe(false);
    expect(isActivityDataNonEmpty('story-questions', { story_question: '   ' })).toBe(false);
    expect(isActivityDataNonEmpty('story-questions', { story_question: 'What occurred?' })).toBe(true);
  });

  it('evaluates localized story questions object correctly', () => {
    expect(isActivityDataNonEmpty('story-questions', { story_question: { en: '', es: '' } })).toBe(false);
    expect(isActivityDataNonEmpty('story-questions', { story_question: { en: 'What happened?', es: '' } })).toBe(true);
  });

  it('rejects empty plain object and accepts non-empty generic objects', () => {
    expect(isActivityDataNonEmpty('topic', {})).toBe(false);
    expect(isActivityDataNonEmpty('topic', { focus: 'Climate change' })).toBe(true);
  });
});
