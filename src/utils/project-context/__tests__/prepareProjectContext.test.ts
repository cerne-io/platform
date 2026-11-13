import { describe, it, expect } from 'vitest';
import {
  extractQuestionFromResponse,
  extractGeneratedQuestion,
  cleanGeneratedQuestion,
  processGeneratedQuestion,
  processAIResponse
} from '@/components/design/improver/questionUtils';
import { formatProjectContext } from '@/utils/project-context/formatters/sections/projectContext';

describe('Generated story question processing', () => {
  it('picks the first real question from multi-option output', () => {
    const raw = `Here are 3 story question options for you to consider:
1. What was a memorable experience when you collaborated with a new team?
2. Can you tell us about a time when you experienced a major shift in process?

Let me know if you would like me to adjust any of these!`;
    expect(extractGeneratedQuestion(raw)).toBe('What was a memorable experience when you collaborated with a new team?');
  });

  it('strips markdown and labels', () => {
    const raw = `**Story Question:**
Can you tell us about a time when leadership made a decision that affected your daily work?`;
    expect(processGeneratedQuestion(raw)).toBe('Can you tell us about a time when leadership made a decision that affected your daily work?');
  });

  it('extracts quoted questions and drops sign-offs', () => {
    expect(extractGeneratedQuestion('I suggest asking: "What was a moment when you felt truly supported by your colleagues?" Hope this helps!'))
      .toBe('What was a moment when you felt truly supported by your colleagues?');
  });

  it('cleans list markers, duplicate question marks and preserves hyphenated words', () => {
    expect(cleanGeneratedQuestion('1. can you describe a long-term change at work??'))
      .toBe('Can you describe a long-term change at work?');
  });
});

describe('Persisted / user-authored questions are NOT truncated (regression guard)', () => {
  it('processAIResponse leaves multi-question user text intact', () => {
    const q = 'Tell us about a time you faced change. What happened? How did you feel?';
    expect(processAIResponse(q)).toBe(q);
  });

  it('extractQuestionFromResponse keeps legacy last-question-mark behavior', () => {
    expect(extractQuestionFromResponse('What happened? How did you feel? Thanks!')).toBe('What happened? How did you feel?');
  });
});

describe('formatProjectContext with project_success', () => {
  it('formats projectSuccess when saved with project_success key', () => {
    const result = formatProjectContext({
      projectSuccess: { project_success: 'Increased team psychological safety.' }
    });
    expect(result).toContain('Project Success Criteria:');
    expect(result).toContain('Increased team psychological safety');
  });
});
