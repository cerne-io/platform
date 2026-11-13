import { describe, it, expect } from 'vitest';
import {
  normalizeLocaleCode,
  isSupportedLanguage,
  parseSupportedLanguage,
  resolveEffectiveLocale,
  getLocalizedValue,
} from '../localeResolution';
import {
  NORMALIZATION_FIXTURES,
  IS_SUPPORTED_FIXTURES,
  PARSE_SUPPORTED_FIXTURES,
  RESOLUTION_FIXTURES,
  LOCALIZATION_FIXTURES,
} from './localeResolutionFixtures';

describe('localeResolution (Shared Parity Suite)', () => {
  describe('normalizeLocaleCode parity fixtures', () => {
    NORMALIZATION_FIXTURES.forEach(({ input, expected }, idx) => {
      it(`[Case ${idx + 1}] normalizes "${String(input)}" to "${expected}"`, () => {
        expect(normalizeLocaleCode(input)).toBe(expected);
      });
    });
  });

  describe('isSupportedLanguage exact type guard fixtures', () => {
    IS_SUPPORTED_FIXTURES.forEach(({ input, expected }, idx) => {
      it(`[Case ${idx + 1}] isSupportedLanguage(${JSON.stringify(input)}) is ${expected}`, () => {
        expect(isSupportedLanguage(input)).toBe(expected);
      });
    });
  });

  describe('parseSupportedLanguage parser fixtures', () => {
    PARSE_SUPPORTED_FIXTURES.forEach(({ input, expected }, idx) => {
      it(`[Case ${idx + 1}] parseSupportedLanguage("${String(input)}") is "${expected}"`, () => {
        expect(parseSupportedLanguage(input)).toBe(expected);
      });
    });
  });

  describe('resolveEffectiveLocale deterministic precedence fixtures', () => {
    RESOLUTION_FIXTURES.forEach(({ description, options, expected }) => {
      it(description, () => {
        const resolved = resolveEffectiveLocale(options);
        expect(resolved).toBe(expected);
      });
    });
  });

  describe('getLocalizedValue content fallback fixtures', () => {
    LOCALIZATION_FIXTURES.forEach(({ description, translations, effectiveLocale, defaultLocale, baseFallback, expected }) => {
      it(description, () => {
        const result = getLocalizedValue(translations, effectiveLocale, defaultLocale, baseFallback);
        expect(result).toBe(expected);
      });
    });
  });
});
