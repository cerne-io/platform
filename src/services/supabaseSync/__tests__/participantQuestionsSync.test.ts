import { describe, it, expect } from 'vitest';
import { cleanParticipantQuestion } from '../../sync/participantQuestionsSyncService';
import { ParticipantQuestion } from '../../types/designTypes';

describe('cleanParticipantQuestion', () => {
  it('preserves questionType = "checkboxes"', () => {
    const question: ParticipantQuestion = {
      id: 'q-checkboxes-1',
      label: 'Select all skills',
      questionType: 'checkboxes',
      includePreferNotToSay: false,
      choices: [
        { id: 'c1', label: 'Coding' },
        { id: 'c2', label: 'Design' },
      ],
    };

    const cleaned = cleanParticipantQuestion(question);
    expect(cleaned.questionType).toBe('checkboxes');
    expect(cleaned.includePreferNotToSay).toBe(false);
    expect(cleaned.label).toBe('Select all skills');
    expect(cleaned.choices).toHaveLength(2);
  });

  it('preserves fallback type property if questionType is missing', () => {
    const question = {
      id: 'q-checkboxes-2',
      label: 'Select features',
      type: 'checkboxes',
      choices: [{ id: 'c1', label: 'Feature 1' }],
    } as unknown as ParticipantQuestion;

    const cleaned = cleanParticipantQuestion(question);
    expect(cleaned.questionType).toBe('checkboxes');
  });

  it('defaults to multiple-choice when questionType is missing or multiple-choice', () => {
    const question: ParticipantQuestion = {
      id: 'q-mc-1',
      label: 'Select one department',
      questionType: 'multiple-choice',
      includePreferNotToSay: true,
      choices: [{ id: 'c1', label: 'Sales' }],
    };

    const cleaned = cleanParticipantQuestion(question);
    expect(cleaned.questionType).toBe('multiple-choice');
    expect(cleaned.includePreferNotToSay).toBe(true);

    const questionNoType: ParticipantQuestion = {
      id: 'q-mc-2',
      label: 'Select department',
      choices: [{ id: 'c1', label: 'Sales' }],
    };
    const cleanedNoType = cleanParticipantQuestion(questionNoType);
    expect(cleanedNoType.questionType).toBe('multiple-choice');
  });
});
