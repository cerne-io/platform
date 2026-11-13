/**
 * Isomorphic Locale Resolution Engine
 * Used across frontend and Supabase backend to guarantee single-source-of-truth
 * localization semantics for public forms and interviews.
 */

export const SUPPORTED_LANGUAGES = ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'nl'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
export const DEFAULT_FALLBACK_LANGUAGE: SupportedLanguage = 'en';

export interface FormLanguagesConfig {
  enabledLanguages?: string[] | null;
  defaultLanguage?: string | null;
}

export interface LocaleResolutionOptions {
  userSelection?: string | null;
  urlParam?: string | null;
  formLanguages?: FormLanguagesConfig | null;
  appFallback?: SupportedLanguage | string;
}

/**
 * Normalizes locale strings into canonical format and explicit aliases.
 * Formatting:
 * - Trims whitespace and converts underscores to hyphens.
 * - Resolves explicit aliases:
 *     'pt' -> 'pt-BR' (generic Portuguese per policy)
 *     'en-us', 'en-gb' -> 'en'
 *     'es-es' -> 'es', etc.
 * Note: 'pt-PT' is a distinct regional dialect and is NOT mapped to 'pt-BR'.
 */
export function normalizeLocaleCode(code?: string | null): string {
  if (!code || typeof code !== 'string') return '';
  const trimmed = code.trim().replace(/_/g, '-');
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();

  // Explicit regional alias for generic Portuguese only
  if (lower === 'pt' || lower === 'pt-br') return 'pt-BR';
  if (lower === 'pt-pt') return 'pt-PT';

  // English aliases
  if (lower === 'en' || lower === 'en-us' || lower === 'en-gb') return 'en';

  // European language canonicalizations
  if (lower === 'es' || lower === 'es-es') return 'es';
  if (lower === 'fr' || lower === 'fr-fr') return 'fr';
  if (lower === 'de' || lower === 'de-de') return 'de';
  if (lower === 'it' || lower === 'it-it') return 'it';
  if (lower === 'nl' || lower === 'nl-nl') return 'nl';

  // Return standard cased tag
  return trimmed;
}

/**
 * Exact membership type guard against SupportedLanguage union.
 */
export function isSupportedLanguage(code: unknown): code is SupportedLanguage {
  return typeof code === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

/**
 * Normalizes input and validates whether it maps to a SupportedLanguage.
 * Returns the canonical SupportedLanguage or null if unsupported.
 */
export function parseSupportedLanguage(code: string | null | undefined): SupportedLanguage | null {
  if (!code || typeof code !== 'string') return null;
  const normalized = normalizeLocaleCode(code);
  return isSupportedLanguage(normalized) ? normalized : null;
}

/**
 * Resolves the effective locale following the strict precedence:
 * 1. Participant explicit user selection (must be supported and enabled if enabledLanguages is present)
 * 2. Valid URL ?lang= parameter (must be supported and enabled if enabledLanguages is present)
 * 3. Form's configured default language (must be supported and enabled)
 * 4. First valid enabled language (if form default is invalid/disabled)
 * 5. Application fallback ('en')
 * 
 * Note: Browser language and admin/cached localStorage MUST NOT override form default.
 */
export function resolveEffectiveLocale(options: LocaleResolutionOptions): SupportedLanguage {
  const { userSelection, urlParam, formLanguages, appFallback = DEFAULT_FALLBACK_LANGUAGE } = options;

  const rawEnabled = formLanguages?.enabledLanguages;
  const enabled: SupportedLanguage[] = Array.isArray(rawEnabled)
    ? (rawEnabled.map(parseSupportedLanguage).filter((l): l is SupportedLanguage => l !== null))
    : [];

  const isAllowed = (lang: SupportedLanguage): boolean => {
    return enabled.length === 0 || enabled.includes(lang);
  };

  // 1. Explicit user selection
  const parsedUser = parseSupportedLanguage(userSelection);
  if (parsedUser && isAllowed(parsedUser)) {
    return parsedUser;
  }

  // 2. URL ?lang= parameter
  const parsedUrl = parseSupportedLanguage(urlParam);
  if (parsedUrl && isAllowed(parsedUrl)) {
    return parsedUrl;
  }

  // 3. Form's configured default language
  const parsedFormDefault = parseSupportedLanguage(formLanguages?.defaultLanguage);
  if (parsedFormDefault && isAllowed(parsedFormDefault)) {
    return parsedFormDefault;
  }
  if (parsedFormDefault && enabled.length === 0) {
    return parsedFormDefault;
  }

  // 4. First valid enabled language (reconciliation for inconsistent configurations)
  if (enabled.length > 0) {
    return enabled[0];
  }

  // 5. Application base fallback ('en')
  return parseSupportedLanguage(appFallback) || DEFAULT_FALLBACK_LANGUAGE;
}

/**
 * Deterministic content fallback lookup for multi-language objects:
 * 1. Effective locale (exact then normalized)
 * 2. Dialect equivalents (e.g. pt-BR <-> pt)
 * 3. Form default locale
 * 4. Application base fallback ('en')
 * 5. Diagnostic warning and baseFallback (empty / undefined) - NO arbitrary first-key fallback!
 */
export function getLocalizedValue<T>(
  translations: Record<string, T> | undefined | null,
  effectiveLocale: string,
  defaultLocale?: string,
  baseFallback?: T
): T | undefined {
  if (!translations || typeof translations !== 'object') {
    return baseFallback;
  }

  const normEffective = parseSupportedLanguage(effectiveLocale) || normalizeLocaleCode(effectiveLocale);
  const normDefault = parseSupportedLanguage(defaultLocale) || normalizeLocaleCode(defaultLocale);

  // 1. Try effective locale (exact key then normalized)
  if (translations[effectiveLocale] !== undefined) return translations[effectiveLocale];
  if (normEffective && translations[normEffective] !== undefined) return translations[normEffective];

  // Dialect mapping (e.g. requested pt-BR but keyed as pt, or vice versa)
  if (normEffective === 'pt-BR' && translations['pt'] !== undefined) return translations['pt'];
  if (normEffective === 'pt' && translations['pt-BR'] !== undefined) return translations['pt-BR'];

  // 2. Try form default locale
  if (defaultLocale && translations[defaultLocale] !== undefined) return translations[defaultLocale];
  if (normDefault && translations[normDefault] !== undefined) return translations[normDefault];

  // Dialect mapping for default locale
  if (normDefault === 'pt-BR' && translations['pt'] !== undefined) return translations['pt'];
  if (normDefault === 'pt' && translations['pt-BR'] !== undefined) return translations['pt-BR'];

  // 3. Try application base fallback 'en'
  if (translations['en'] !== undefined) return translations['en'];
  if (translations['en-US'] !== undefined) return translations['en-US'];

  // 4. Diagnostic warning and baseFallback
  let isDev = false;
  try {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
      isDev = true;
    }
  } catch {
    // Environment access restricted (e.g. Deno default permissions)
  }
  if (!isDev) {
    try {
      if (typeof window !== 'undefined' && Boolean((window as unknown as { __DEV__?: boolean }).__DEV__)) {
        isDev = true;
      }
    } catch {
      // Ignore
    }
  }

  if (isDev) {
    console.warn(`[getLocalizedValue] Missing translation for "${effectiveLocale}" (default: "${defaultLocale}"). No English fallback found.`);
  }

  return baseFallback;
}
