import { describe, it, expect } from 'vitest';
import { createDefaultQuestion, CERNE_QUESTION_TYPES } from '../types';

describe('Form Builder Types & Default Creators', () => {
  it('defines basic and additional Cerne question types', () => {
    expect(CERNE_QUESTION_TYPES).toHaveLength(7);
    const basic = CERNE_QUESTION_TYPES.filter((q) => q.group === 'basic');
    const additional = CERNE_QUESTION_TYPES.filter((q) => q.group === 'additional');
    expect(basic).toHaveLength(5);
    expect(additional).toHaveLength(2);
    expect(additional.map((q) => q.type)).toEqual(['multiple-choice', 'checkboxes']);
  });

  it('creates valid default story-question', () => {
    const q = createDefaultQuestion('story-question');
    expect(q.type).toBe('story-question');
    expect(q.id).toBeDefined();
    expect(q.label).toContain('experience');
    expect(q.placeholder).toBeDefined();
  });

  it('creates valid default emotional-response question', () => {
    const q = createDefaultQuestion('emotional-response');
    expect(q.type).toBe('emotional-response');
    expect(q.id).toBeDefined();
    expect(q.label).toContain('feel');
    expect(q.required).toBe(true);
    expect(q.options?.map((o) => o.id)).toEqual([
      'enthusiastic',
      'confused',
      'frustrated',
      'engaged',
      'other',
    ]);
  });

  it('creates localized default emotional-response question when lang is provided', () => {
    const qPt = createDefaultQuestion('emotional-response', false, 'pt-BR');
    expect(qPt.label).toBe('Como você se sente em relação à experiência que compartilhou?');
    expect(qPt.options?.map((o) => o.label)).toEqual([
      'Entusiasmado',
      'Confuso',
      'Frustrado',
      'Engajado',
      'Outro',
    ]);

    const qEs = createDefaultQuestion('emotional-response', false, 'es');
    expect(qEs.label).toBe('¿Cómo se siente acerca de la experiencia que compartió?');
    expect(qEs.options?.[0].label).toBe('Entusiasta');
  });

  it('creates valid default slider question', () => {
    const q = createDefaultQuestion('slider');
    expect(q.type).toBe('slider');
    expect(q.label).toBe('Slider Question');
    expect(q.sliderConfig).toBeDefined();
    expect(q.sliderConfig?.leftLabel).toBe('Left Label');
    expect(q.sliderConfig?.rightLabel).toBe('Right Label');
    expect(q.sliderConfig?.min).toBe(0);
    expect(q.sliderConfig?.max).toBe(100);
  });

  it('creates valid default triangle question', () => {
    const q = createDefaultQuestion('triangle');
    expect(q.type).toBe('triangle');
    expect(q.label).toBe('Triangle Question');
    expect(q.triangleConfig).toBeDefined();
    expect(q.triangleConfig?.topLabel).toBe('Top Label');
    expect(q.triangleConfig?.bottomLeftLabel).toBe('Bottom Left Label');
    expect(q.triangleConfig?.bottomRightLabel).toBe('Bottom Right Label');
  });

  it('creates valid default participant-questions (with opt-out)', () => {
    const q = createDefaultQuestion('participant-questions');
    expect(q.type).toBe('participant-questions');
    expect(q.label).toBe('Participant Questions');
    expect(q.options).toBeDefined();
    expect(q.options?.map((o) => o.label)).toEqual(['Choice 1', 'Choice 2', 'Choice 3']);
    expect(q.includePreferNotToSay).toBe(true);
  });

  it('creates valid default multiple-choice question without prefer not to say', () => {
    const q = createDefaultQuestion('multiple-choice');
    expect(q.type).toBe('multiple-choice');
    expect(q.label).toBe('Multiple Choice');
    expect(q.options).toBeDefined();
    expect(q.options?.map((o) => o.label)).toEqual(['Choice 1', 'Choice 2', 'Choice 3']);
    expect(q.includePreferNotToSay).toBe(false);
  });

  it('creates valid default checkboxes question without prefer not to say', () => {
    const q = createDefaultQuestion('checkboxes');
    expect(q.type).toBe('checkboxes');
    expect(q.label).toBe('Checkboxes');
    expect(q.options).toBeDefined();
    expect(q.options?.map((o) => o.label)).toEqual(['Option 1', 'Option 2', 'Option 3']);
    expect(q.includePreferNotToSay).toBe(false);
  });

  it('cleanDisplayLabel unpacks localized JSON string to clean text', async () => {
    const { cleanDisplayLabel } = await import('../SortableQuestionCard');
    const multiJson = JSON.stringify({
      en: 'Can you share the pivotal moments?',
      es: '¿Puedes compartir los momentos clave?',
    });
    expect(cleanDisplayLabel(multiJson, 'en')).toBe('Can you share the pivotal moments?');
    expect(cleanDisplayLabel(multiJson, 'es')).toBe('¿Puedes compartir los momentos clave?');
    expect(cleanDisplayLabel('Plain text', 'en')).toBe('Plain text');
  });
});
