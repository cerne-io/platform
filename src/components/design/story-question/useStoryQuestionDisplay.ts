import { ProjectLanguages } from "@/services/formLanguageService";

interface TranslationInfo {
  translations: Record<string, string>;
  displayQuestion: string;
}

/**
 * Safely parses the saved question into translations and a single display question.
 * The savedQuestion could be a raw string, a JSON stringified object, or an object.
 */
export function getQuestionDisplayData(
  savedQuestion: unknown,
  langConfig: ProjectLanguages,
  activeLang: string
): TranslationInfo {
  let translations: Record<string, string> = {};
  let displayQuestion = "";

  if (!savedQuestion) {
    return { translations, displayQuestion };
  }

  if (typeof savedQuestion === 'string') {
    try {
      const parsed = JSON.parse(savedQuestion);
      if (typeof parsed === 'object' && parsed !== null) {
        translations = parsed;
        displayQuestion = translations[activeLang] || translations[langConfig.defaultLanguage] || '';
      } else {
        translations = { [langConfig.defaultLanguage || 'en']: savedQuestion };
        displayQuestion = savedQuestion;
      }
    } catch (_e) {
      translations = { [langConfig.defaultLanguage || 'en']: savedQuestion };
      displayQuestion = savedQuestion;
    }
  } else {
    translations = savedQuestion as Record<string, string>;
    displayQuestion = translations[activeLang] || translations[langConfig.defaultLanguage] || Object.values(translations)[0] || '';
  }

  return { translations, displayQuestion };
}
