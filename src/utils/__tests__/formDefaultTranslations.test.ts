import { describe, it, expect } from 'vitest';
import {
  getPreferNotToSayLabel,
  getStoryPlaceholder,
  getEmotionalResponseDefaults,
  isPreferNotToSayValue,
} from '../formDefaultTranslations';
import { getBaseLabel } from '../participantFilterUtils';

describe('formDefaultTranslations', () => {
  describe('getPreferNotToSayLabel', () => {
    it('returns correct label for all 7 supported languages', () => {
      expect(getPreferNotToSayLabel('en')).toBe('Prefer not to say');
      expect(getPreferNotToSayLabel('pt-BR')).toBe('Prefiro não dizer');
      expect(getPreferNotToSayLabel('es')).toBe('Prefiero no decirlo');
      expect(getPreferNotToSayLabel('fr')).toBe('Préfère ne pas répondre');
      expect(getPreferNotToSayLabel('de')).toBe('Keine Angabe');
      expect(getPreferNotToSayLabel('it')).toBe('Preferisco non dirlo');
      expect(getPreferNotToSayLabel('nl')).toBe('Liever niet zeggen');
    });

    it('handles aliases (e.g. pt -> pt-BR, es-ES -> es)', () => {
      expect(getPreferNotToSayLabel('pt')).toBe('Prefiro não dizer');
      expect(getPreferNotToSayLabel('es-ES')).toBe('Prefiero no decirlo');
    });

    it('falls back to English for unknown/unsupported languages', () => {
      expect(getPreferNotToSayLabel('pl')).toBe('Prefer not to say');
      expect(getPreferNotToSayLabel('ja')).toBe('Prefer not to say');
      expect(getPreferNotToSayLabel(null)).toBe('Prefer not to say');
      expect(getPreferNotToSayLabel(undefined)).toBe('Prefer not to say');
    });

    it('unifies old English and new localized Prefer not to say responses in getBaseLabel', () => {
      const ptQuestions = [
        {
          id: 'p1',
          label: 'Cargo',
          choices: [{ id: 'prefer-not-to-say', label: 'Prefiro não dizer' }],
        },
      ];
      expect(isPreferNotToSayValue('Prefiro não dizer')).toBe(true);
      expect(isPreferNotToSayValue('Prefer not to say')).toBe(true);
      expect(isPreferNotToSayValue('Keine Angabe')).toBe(true);
      expect(getBaseLabel('p1', 'Prefer not to say', ptQuestions)).toBe('Prefiro não dizer');
      expect(getBaseLabel('p1', 'Prefiro não dizer', ptQuestions)).toBe('Prefiro não dizer');
    });
  });

  describe('getStoryPlaceholder', () => {
    it('returns correct placeholder for all 7 supported languages', () => {
      expect(getStoryPlaceholder('en')).toBe('Please share your experience here...');
      expect(getStoryPlaceholder('pt-BR')).toBe('Por favor, compartilhe sua experiência aqui...');
      expect(getStoryPlaceholder('es')).toBe('Por favor, comparta su experiencia aquí...');
      expect(getStoryPlaceholder('fr')).toBe('Veuillez partager votre expérience ici...');
      expect(getStoryPlaceholder('de')).toBe('Bitte teilen Sie hier Ihre Erfahrung mit...');
      expect(getStoryPlaceholder('it')).toBe('Per favore, condividi la tua esperienza qui...');
      expect(getStoryPlaceholder('nl')).toBe('Deel hier uw ervaring...');
    });
  });

  describe('getEmotionalResponseDefaults', () => {
    it('returns localized label and options for pt-BR', () => {
      const pt = getEmotionalResponseDefaults('pt-BR');
      expect(pt.label).toBe('Como você se sente em relação à experiência que compartilhou?');
      expect(pt.options.map((o) => o.label)).toEqual([
        'Entusiasmado',
        'Confuso',
        'Frustrado',
        'Engajado',
        'Outro',
      ]);
      expect(pt.options.map((o) => o.id)).toEqual([
        'enthusiastic',
        'confused',
        'frustrated',
        'engaged',
        'other',
      ]);
    });

    it('returns localized label and options for es', () => {
      const es = getEmotionalResponseDefaults('es');
      expect(es.label).toBe('¿Cómo se siente acerca de la experiencia que compartió?');
      expect(es.options[0]).toEqual({ id: 'enthusiastic', label: 'Entusiasta' });
      expect(es.options[4]).toEqual({ id: 'other', label: 'Otro' });
    });

    it('returns localized label and options for de', () => {
      const de = getEmotionalResponseDefaults('de');
      expect(de.label).toBe('Wie fühlen Sie sich bezüglich der geteilten Erfahrung?');
      expect(de.options[0]).toEqual({ id: 'enthusiastic', label: 'Enthusiastisch' });
      expect(de.options[4]).toEqual({ id: 'other', label: 'Sonstiges' });
    });

    it('defaults to English when unsupported', () => {
      const fallback = getEmotionalResponseDefaults('unknown');
      expect(fallback.label).toBe('How do you feel about the experience you shared?');
      expect(fallback.options[0]).toEqual({ id: 'enthusiastic', label: 'Enthusiastic' });
    });

    it('prefers active i18n loaded bundle when available', async () => {
      const { default: i18n } = await import('@/i18n');
      i18n.addResourceBundle('pt-BR', 'translation', {
        public: {
          form: {
            prefer_not_to_say: 'Prefiro não informar',
            placeholder: 'Compartilhe seu relato aqui...',
            emotional_response: {
              question: 'Qual o sentimento sobre o seu relato?',
              options: {
                enthusiastic: 'Animado',
                confused: 'Em dúvida',
                frustrated: 'Chateado',
                engaged: 'Focado',
                other: 'Diferente',
              },
            },
          },
        },
      }, true, true);

      expect(getPreferNotToSayLabel('pt-BR')).toBe('Prefiro não informar');
      expect(getStoryPlaceholder('pt-BR')).toBe('Compartilhe seu relato aqui...');
      const customPt = getEmotionalResponseDefaults('pt-BR');
      expect(customPt.label).toBe('Qual o sentimento sobre o seu relato?');
      expect(customPt.options[0]).toEqual({ id: 'enthusiastic', label: 'Animado' });
      expect(customPt.options[4]).toEqual({ id: 'other', label: 'Diferente' });
    });
  });
});
