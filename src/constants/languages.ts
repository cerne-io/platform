export interface LanguageInfo {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', flag: '🇧🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
];

export interface ProjectLanguages {
  enabledLanguages: string[];
  defaultLanguage: string;
}

export const DEFAULT_LANGUAGES: ProjectLanguages = {
  enabledLanguages: ["en"],
  defaultLanguage: "en",
};

export const getLanguageName = (code: string) => {
  return SUPPORTED_LANGUAGES.find(l => l.code === code)?.name || code;
};
