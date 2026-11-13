import { describe, it, expect } from 'vitest';
import { cleanStoryText } from '../formattingUtils';

describe('cleanStoryText', () => {
  it('strips both trailing title and trailing additional comments from user bug report', () => {
    const raw =
      'No processo de trabalho com narrativas normalmente a tá envolvida de uma forma incoerente. As pessoas pegam as histórias compartilhadas e acabam colocando nos no LLM pra entender o que aconteceu. Essa não é a melhor forma de interpretação e a tentativa é que as pessoas possam mudar pra algo mais coerente Sim as pessoas em uma organização pegaram todos os dados que foram encontrados e antes da gente fazer as conversas pra poder interpretar-los com o conjunto colocaram em 1LM pra ter um entendimento geral. Esse entendimento acaba gerando algo em enviados especificamente pro trabalho que venha a seguir então acaba trabalhando mais o trabalho do que ajudando. #muitacalmanessahora Nope';

    const title = '#muitacalmanessahora';
    const comments = 'Nope';

    const cleaned = cleanStoryText(raw, title, comments);

    expect(cleaned).toBe(
      'No processo de trabalho com narrativas normalmente a tá envolvida de uma forma incoerente. As pessoas pegam as histórias compartilhadas e acabam colocando nos no LLM pra entender o que aconteceu. Essa não é a melhor forma de interpretação e a tentativa é que as pessoas possam mudar pra algo mais coerente Sim as pessoas em uma organização pegaram todos os dados que foram encontrados e antes da gente fazer as conversas pra poder interpretar-los com o conjunto colocaram em 1LM pra ter um entendimento geral. Esse entendimento acaba gerando algo em enviados especificamente pro trabalho que venha a seguir então acaba trabalhando mais o trabalho do que ajudando.'
    );
  });

  it('strips leading title if title was prepended to the story', () => {
    const raw = 'Awesome Experience\nThis was an amazing story that happened yesterday.';
    const title = 'Awesome Experience';

    const cleaned = cleanStoryText(raw, title);
    expect(cleaned).toBe('This was an amazing story that happened yesterday.');
  });

  it('strips trailing title when no additional comments exist', () => {
    const raw = 'This was an amazing story that happened yesterday. #awesome';
    const title = '#awesome';

    const cleaned = cleanStoryText(raw, title);
    expect(cleaned).toBe('This was an amazing story that happened yesterday.');
  });

  it('strips trailing comments when no title in text', () => {
    const raw = 'This was an amazing story that happened yesterday. None';
    const comments = 'None';

    const cleaned = cleanStoryText(raw, undefined, comments);
    expect(cleaned).toBe('This was an amazing story that happened yesterday.');
  });

  it('does not mutate text if title and comments do not match', () => {
    const raw = 'Normal narrative that does not contain title or comments.';
    const cleaned = cleanStoryText(raw, 'Different Title', 'Other comments');
    expect(cleaned).toBe(raw);
  });

  it('handles titles with special regex characters safely', () => {
    const raw = 'Story with regex characters? [yes/no] (100% true)';
    const title = '[yes/no] (100% true)';

    const cleaned = cleanStoryText(raw, title);
    expect(cleaned).toBe('Story with regex characters?');
  });

  it('safely retains text if text consists entirely of the title', () => {
    const raw = 'OnlyTitle';
    const title = 'OnlyTitle';

    const cleaned = cleanStoryText(raw, title);
    expect(cleaned).toBe('OnlyTitle');
  });

  it('returns empty string on empty input', () => {
    expect(cleanStoryText('')).toBe('');
  });
});
