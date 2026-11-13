/**
 * Shared Parity Test Fixtures for Locale Resolution Engine
 * Used identically across frontend (Vitest) and backend (Deno).
 */

import {
  LocaleResolutionOptions,
  SupportedLanguage,
} from '../localeResolution';

export interface NormalizationFixture {
  input: string | null | undefined;
  expected: string;
}

export interface IsSupportedFixture {
  input: unknown;
  expected: boolean;
}

export interface ParseSupportedFixture {
  input: string | null | undefined;
  expected: SupportedLanguage | null;
}

export interface ResolutionFixture {
  description: string;
  options: LocaleResolutionOptions;
  expected: SupportedLanguage;
}

export interface LocalizationFixture {
  description: string;
  translations: Record<string, string> | undefined | null;
  effectiveLocale: string;
  defaultLocale?: string;
  baseFallback?: string;
  expected: string | undefined;
}

export const NORMALIZATION_FIXTURES: NormalizationFixture[] = [
  { input: 'en', expected: 'en' },
  { input: 'en-US', expected: 'en' },
  { input: 'en_gb', expected: 'en' },
  { input: 'pt', expected: 'pt-BR' },
  { input: 'pt-br', expected: 'pt-BR' },
  { input: 'PT_BR', expected: 'pt-BR' },
  { input: 'pt-BR', expected: 'pt-BR' },
  // pt-PT is a distinct regional dialect not mapped to pt-BR
  { input: 'pt-PT', expected: 'pt-PT' },
  { input: 'pt_pt', expected: 'pt-PT' },
  { input: 'es', expected: 'es' },
  { input: 'es-es', expected: 'es' },
  { input: 'fr', expected: 'fr' },
  { input: 'fr-FR', expected: 'fr' },
  { input: 'de', expected: 'de' },
  { input: 'de-DE', expected: 'de' },
  { input: 'it', expected: 'it' },
  { input: 'it-IT', expected: 'it' },
  { input: 'nl', expected: 'nl' },
  { input: 'nl-NL', expected: 'nl' },
  { input: '', expected: '' },
  { input: '   ', expected: '' },
  { input: null, expected: '' },
  { input: undefined, expected: '' },
];

export const IS_SUPPORTED_FIXTURES: IsSupportedFixture[] = [
  { input: 'en', expected: true },
  { input: 'pt-BR', expected: true },
  { input: 'es', expected: true },
  { input: 'fr', expected: true },
  { input: 'de', expected: true },
  { input: 'it', expected: true },
  { input: 'nl', expected: true },
  // Non-canonical or unsupported codes are strictly not in SupportedLanguage union
  { input: 'pt', expected: false },
  { input: 'pt-br', expected: false },
  { input: 'PT_BR', expected: false },
  { input: 'pt-PT', expected: false },
  { input: 'en-US', expected: false },
  { input: 'ja', expected: false },
  { input: '', expected: false },
  { input: null, expected: false },
  { input: undefined, expected: false },
  { input: 123, expected: false },
  { input: {}, expected: false },
];

export const PARSE_SUPPORTED_FIXTURES: ParseSupportedFixture[] = [
  { input: 'en', expected: 'en' },
  { input: 'en-US', expected: 'en' },
  { input: 'en_GB', expected: 'en' },
  { input: 'pt', expected: 'pt-BR' }, // explicit alias for generic Portuguese
  { input: 'pt-br', expected: 'pt-BR' },
  { input: 'PT_BR', expected: 'pt-BR' },
  { input: 'pt-BR', expected: 'pt-BR' },
  // pt-PT is unsupported
  { input: 'pt-PT', expected: null },
  { input: 'pt_pt', expected: null },
  { input: 'es', expected: 'es' },
  { input: 'es-es', expected: 'es' },
  { input: 'fr', expected: 'fr' },
  { input: 'de', expected: 'de' },
  { input: 'it', expected: 'it' },
  { input: 'nl', expected: 'nl' },
  { input: 'ja', expected: null },
  { input: 'zh', expected: null },
  { input: null, expected: null },
  { input: undefined, expected: null },
];

export const RESOLUTION_FIXTURES: ResolutionFixture[] = [
  {
    description: '1. Explicit user selection wins when enabled',
    options: {
      userSelection: 'en',
      urlParam: 'pt-BR',
      formLanguages: { defaultLanguage: 'pt-BR', enabledLanguages: ['pt-BR', 'en'] },
      appFallback: 'en',
    },
    expected: 'en',
  },
  {
    description: '2. Disabled user selection falls through to enabled URL param',
    options: {
      userSelection: 'de',
      urlParam: 'en',
      formLanguages: { defaultLanguage: 'pt-BR', enabledLanguages: ['pt-BR', 'en'] },
      appFallback: 'en',
    },
    expected: 'en',
  },
  {
    description: '3. Valid URL param wins when no user selection and enabled',
    options: {
      userSelection: null,
      urlParam: 'en',
      formLanguages: { defaultLanguage: 'pt-BR', enabledLanguages: ['pt-BR', 'en'] },
      appFallback: 'en',
    },
    expected: 'en',
  },
  {
    description: '4. Disabled URL param falls back to form default',
    options: {
      userSelection: null,
      urlParam: 'de',
      formLanguages: { defaultLanguage: 'pt-BR', enabledLanguages: ['pt-BR', 'en'] },
      appFallback: 'en',
    },
    expected: 'pt-BR',
  },
  {
    description: '5. Form default language wins when no user or URL override',
    options: {
      formLanguages: { defaultLanguage: 'pt-BR', enabledLanguages: ['pt-BR', 'en'] },
      appFallback: 'en',
    },
    expected: 'pt-BR',
  },
  {
    description: '6. Missing form configuration falls back to app fallback (English), not Portuguese',
    options: {
      formLanguages: null,
      appFallback: 'en',
    },
    expected: 'en',
  },
  {
    description: '7. Unconfigured form does not block valid supported user selection',
    options: {
      userSelection: 'pt-BR',
      formLanguages: null,
      appFallback: 'en',
    },
    expected: 'pt-BR',
  },
  {
    description: '8. Inconsistent form default (unsupported language) falls back to app fallback',
    options: {
      formLanguages: { defaultLanguage: 'klingon', enabledLanguages: [] },
      appFallback: 'en',
    },
    expected: 'en',
  },
  {
    description: '9. pt-PT does NOT resolve to pt-BR; falls back to form default',
    options: {
      userSelection: 'pt-PT',
      formLanguages: { defaultLanguage: 'en', enabledLanguages: ['en', 'pt-BR'] },
      appFallback: 'en',
    },
    expected: 'en',
  },
  {
    description: '10. URL param pt-PT does NOT resolve to pt-BR; falls back to form default',
    options: {
      urlParam: 'pt-PT',
      formLanguages: { defaultLanguage: 'en', enabledLanguages: ['en', 'pt-BR'] },
      appFallback: 'en',
    },
    expected: 'en',
  },
  {
    description: '11. Generic pt resolves to pt-BR alias and is respected if enabled',
    options: {
      userSelection: 'pt',
      formLanguages: { defaultLanguage: 'en', enabledLanguages: ['en', 'pt-BR'] },
      appFallback: 'en',
    },
    expected: 'pt-BR',
  },
];

export const LOCALIZATION_FIXTURES: LocalizationFixture[] = [
  {
    description: 'Exact match returns requested locale',
    translations: { 'pt-BR': 'Texto brasileiro', 'en': 'English text' },
    effectiveLocale: 'pt-BR',
    defaultLocale: 'en',
    expected: 'Texto brasileiro',
  },
  {
    description: 'Dialect mapping: requested pt matches key pt-BR',
    translations: { 'pt-BR': 'Texto brasileiro', 'en': 'English text' },
    effectiveLocale: 'pt',
    defaultLocale: 'en',
    expected: 'Texto brasileiro',
  },
  {
    description: 'Dialect mapping: requested pt-BR matches key pt',
    translations: { 'pt': 'Texto português', 'en': 'English text' },
    effectiveLocale: 'pt-BR',
    defaultLocale: 'en',
    expected: 'Texto português',
  },
  {
    description: 'Falls back to form default locale when requested locale is missing',
    translations: { 'pt-BR': 'Texto padrão', 'en': 'English fallback' },
    effectiveLocale: 'fr',
    defaultLocale: 'pt-BR',
    expected: 'Texto padrão',
  },
  {
    description: 'Falls back to English when both requested and form default are missing',
    translations: { 'en': 'English fallback' },
    effectiveLocale: 'fr',
    defaultLocale: 'de',
    expected: 'English fallback',
  },
  {
    description: 'DETERMINISTIC FALLBACK: Does NOT return unrelated language if neither effective, default, nor English exists',
    translations: { 'de': 'Deutscher Text' },
    effectiveLocale: 'fr',
    defaultLocale: 'es',
    baseFallback: undefined,
    expected: undefined,
  },
];
