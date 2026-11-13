import { normalizeLocaleCode, SupportedLanguage, isSupportedLanguage } from "@/utils/localeResolution";
import i18n from "i18next";

export interface EmotionalResponseOption {
  id: string;
  label: string;
}

export interface EmotionalResponseDefaults {
  label: string;
  options: EmotionalResponseOption[];
}

const PREFER_NOT_TO_SAY_BY_LANG: Record<SupportedLanguage, string> = {
  'en': 'Prefer not to say',
  'pt-BR': 'Prefiro não dizer',
  'es': 'Prefiero no decirlo',
  'fr': 'Préfère ne pas répondre',
  'de': 'Keine Angabe',
  'it': 'Preferisco non dirlo',
  'nl': 'Liever niet zeggen',
};

const PREFER_NOT_TO_SAY_VALUES = new Set<string>([
  'prefer-not-to-say',
  'Je préfère ne pas le dire',
  ...Object.values(PREFER_NOT_TO_SAY_BY_LANG),
]);

export function isPreferNotToSayValue(value?: string | null): boolean {
  return Boolean(value && PREFER_NOT_TO_SAY_VALUES.has(value.trim()));
}

const STORY_PLACEHOLDER_BY_LANG: Record<SupportedLanguage, string> = {
  'en': 'Please share your experience here...',
  'pt-BR': 'Por favor, compartilhe sua experiência aqui...',
  'es': 'Por favor, comparta su experiencia aquí...',
  'fr': 'Veuillez partager votre expérience ici...',
  'de': 'Bitte teilen Sie hier Ihre Erfahrung mit...',
  'it': 'Per favore, condividi la tua esperienza qui...',
  'nl': 'Deel hier uw ervaring...',
};

const EMOTIONAL_RESPONSE_BY_LANG: Record<SupportedLanguage, EmotionalResponseDefaults> = {
  'en': {
    label: 'How do you feel about the experience you shared?',
    options: [
      { id: 'enthusiastic', label: 'Enthusiastic' },
      { id: 'confused', label: 'Confused' },
      { id: 'frustrated', label: 'Frustrated' },
      { id: 'engaged', label: 'Engaged' },
      { id: 'other', label: 'Other' },
    ],
  },
  'pt-BR': {
    label: 'Como você se sente em relação à experiência que compartilhou?',
    options: [
      { id: 'enthusiastic', label: 'Entusiasmado' },
      { id: 'confused', label: 'Confuso' },
      { id: 'frustrated', label: 'Frustrado' },
      { id: 'engaged', label: 'Engajado' },
      { id: 'other', label: 'Outro' },
    ],
  },
  'es': {
    label: '¿Cómo se siente acerca de la experiencia que compartió?',
    options: [
      { id: 'enthusiastic', label: 'Entusiasta' },
      { id: 'confused', label: 'Confundido' },
      { id: 'frustrated', label: 'Frustrado' },
      { id: 'engaged', label: 'Comprometido' },
      { id: 'other', label: 'Otro' },
    ],
  },
  'fr': {
    label: "Que ressentez-vous par rapport à l'expérience que vous avez partagée ?",
    options: [
      { id: 'enthusiastic', label: 'Enthousiaste' },
      { id: 'confused', label: 'Confus' },
      { id: 'frustrated', label: 'Frustré' },
      { id: 'engaged', label: 'Engagé' },
      { id: 'other', label: 'Autre' },
    ],
  },
  'de': {
    label: 'Wie fühlen Sie sich bezüglich der geteilten Erfahrung?',
    options: [
      { id: 'enthusiastic', label: 'Enthusiastisch' },
      { id: 'confused', label: 'Verwirrt' },
      { id: 'frustrated', label: 'Frustriert' },
      { id: 'engaged', label: 'Engagiert' },
      { id: 'other', label: 'Sonstiges' },
    ],
  },
  'it': {
    label: "Cosa provi per l'esperienza che hai condiviso?",
    options: [
      { id: 'enthusiastic', label: 'Entusiasta' },
      { id: 'confused', label: 'Confuso' },
      { id: 'frustrated', label: 'Frustrato' },
      { id: 'engaged', label: 'Coinvolto' },
      { id: 'other', label: 'Altro' },
    ],
  },
  'nl': {
    label: 'Hoe voel je je over de ervaring die je hebt gedeeld?',
    options: [
      { id: 'enthusiastic', label: 'Enthousiast' },
      { id: 'confused', label: 'Verward' },
      { id: 'frustrated', label: 'Gefrustreerd' },
      { id: 'engaged', label: 'Betrokken' },
      { id: 'other', label: 'Anders' },
    ],
  },
};

function resolveLang(lang?: string | null): SupportedLanguage {
  const norm = normalizeLocaleCode(lang);
  return isSupportedLanguage(norm) ? norm : 'en';
}

interface FormTranslationBundle {
  public?: {
    form?: {
      prefer_not_to_say?: string;
      placeholder?: string;
      emotional_response?: {
        question?: string;
        options?: Record<string, string>;
      };
    };
  };
}

function getLoadedFormBundle(lang: SupportedLanguage): FormTranslationBundle['public'] | undefined {
  if (i18n && typeof i18n.getResourceBundle === 'function') {
    const bundle = i18n.getResourceBundle(lang, 'translation') as FormTranslationBundle | undefined;
    if (bundle?.public?.form) {
      return bundle.public;
    }
  }
  return undefined;
}

export function getPreferNotToSayLabel(lang?: string | null): string {
  const norm = resolveLang(lang);
  const bundle = getLoadedFormBundle(norm);
  if (bundle?.form?.prefer_not_to_say) {
    return bundle.form.prefer_not_to_say;
  }
  return PREFER_NOT_TO_SAY_BY_LANG[norm];
}

export function getStoryPlaceholder(lang?: string | null): string {
  const norm = resolveLang(lang);
  const bundle = getLoadedFormBundle(norm);
  if (bundle?.form?.placeholder) {
    return bundle.form.placeholder;
  }
  return STORY_PLACEHOLDER_BY_LANG[norm];
}

export function getEmotionalResponseDefaults(lang?: string | null): EmotionalResponseDefaults {
  const norm = resolveLang(lang);
  const bundle = getLoadedFormBundle(norm);
  const emo = bundle?.form?.emotional_response;
  if (emo?.question && emo?.options) {
    return {
      label: emo.question,
      options: [
        { id: 'enthusiastic', label: emo.options.enthusiastic || 'Enthusiastic' },
        { id: 'confused', label: emo.options.confused || 'Confused' },
        { id: 'frustrated', label: emo.options.frustrated || 'Frustrated' },
        { id: 'engaged', label: emo.options.engaged || 'Engaged' },
        { id: 'other', label: emo.options.other || 'Other' },
      ],
    };
  }
  return EMOTIONAL_RESPONSE_BY_LANG[norm];
}

