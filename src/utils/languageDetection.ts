import { SupportedLanguage } from "@/utils/localeResolution";

// High-signal stop words for non-English supported languages
const LANG_WORDS: Record<Exclude<SupportedLanguage, 'en'>, Set<string>> = {
  'pt-BR': new Set([
    'não', 'você', 'para', 'com', 'uma', 'que', 'sobre', 'como', 'dos', 'das',
    'pelo', 'pela', 'está', 'estão', 'são', 'mais', 'nos', 'nas', 'sua', 'seu',
    'seus', 'suas', 'experiência', 'projeto', 'equipe', 'trabalho', 'história',
    'conte', 'quando'
  ]),
  'es': new Set([
    'pero', 'para', 'con', 'una', 'que', 'sobre', 'como', 'los', 'las', 'del',
    'está', 'están', 'son', 'más', 'usted', 'su', 'sus', 'experiencia',
    'proyecto', 'equipo', 'trabajo', 'historia', 'cuente', 'cuando'
  ]),
  'fr': new Set([
    'pour', 'avec', 'une', 'que', 'dans', 'sur', 'les', 'des', 'est', 'sont',
    'cette', 'plus', 'votre', 'vos', 'projet', 'équipe', 'travail', 'histoire', 'quand'
  ]),
  'de': new Set([
    'nicht', 'für', 'mit', 'eine', 'einer', 'einem', 'einen', 'dass', 'über',
    'die', 'der', 'das', 'den', 'dem', 'des', 'ist', 'sind', 'projekt',
    'erfahrung', 'arbeit', 'geschichte'
  ]),
  'it': new Set([
    'per', 'con', 'una', 'uno', 'che', 'del', 'della', 'delle', 'dei', 'degli',
    'sono', 'questo', 'questa', 'nella', 'nel', 'progetto', 'esperienza', 'lavoro', 'storia'
  ]),
  'nl': new Set([
    'niet', 'voor', 'met', 'een', 'dat', 'die', 'van', 'het', 'der', 'zijn',
    'maar', 'over', 'project', 'ervaring', 'werk', 'verhaal'
  ]),
};

/**
 * Detects whether text is in one of our supported languages (en, pt-BR, es, fr, de, it, nl).
 * Falls back to 'en' if unsupported or below confidence threshold.
 */
export function detectSupportedLanguage(text?: string | null): SupportedLanguage {
  if (!text || typeof text !== 'string') return 'en';

  const words = text.toLowerCase().match(/\p{L}+/gu);
  if (!words || words.length === 0) return 'en';

  let bestLang: SupportedLanguage = 'en';
  let maxMatches = 2; // shortcut: threshold of 3+ words, upgrade to probabilistic n-gram if short text misclassifies

  for (const [lang, wordSet] of Object.entries(LANG_WORDS) as [Exclude<SupportedLanguage, 'en'>, Set<string>][]) {
    let count = 0;
    for (const w of words) {
      if (wordSet.has(w)) count++;
    }
    if (count > maxMatches) {
      maxMatches = count;
      bestLang = lang;
    }
  }

  return bestLang;
}

