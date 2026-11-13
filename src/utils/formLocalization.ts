import { SliderQuestion, TriangleQuestion, ParticipantQuestion } from "@/services/types/designTypes";
import i18next from "i18next";
import { getLocalizedValue, normalizeLocaleCode } from "./localeResolution";
import { getPreferNotToSayLabel } from "./formDefaultTranslations";

// --- Helpers for safeParseStoryQuestion ---

function parseNestedStoryQuestion(obj: Record<string, unknown>): string | Record<string, string> | null {
    if ('storyQuestion' in obj) {
        const sq = obj.storyQuestion;
        if (sq !== null && sq !== undefined) {
            return safeParseStoryQuestion(sq);
        }
    }
    return null;
}

function stripQuotes(str: string): string {
    let trimmed = str.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        trimmed = trimmed.substring(1, trimmed.length - 1).trim();
    }
    return trimmed;
}

function tryParseJsonString(trimmed: string): string | Record<string, string> | null {
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === 'object') {
                return safeParseStoryQuestion(parsed);
            }
        } catch (_e) {
            console.warn("[safeParseStoryQuestion] Failed to parse supposed JSON string:", trimmed.substring(0, 50));
        }
    }
    return null;
}

/**
 * Safely parses a story question from a string (which might be JSON)
 * to either a string or a Record<string, string>
 */
export const safeParseStoryQuestion = (rawContent: unknown): string | Record<string, string> => {
    if (rawContent === null || rawContent === undefined) return "";
    
    // If it's already an object, return it (but check if it's null/empty)
    if (typeof rawContent === 'object' && rawContent !== null) {
        const nested = parseNestedStoryQuestion(rawContent as Record<string, unknown>);
        if (nested !== null) return nested;
        return rawContent as Record<string, string>;
    }

    if (typeof rawContent !== 'string') return String(rawContent);
    if (rawContent.trim() === '') return "";

    const trimmed = stripQuotes(rawContent);
    const jsonParsed = tryParseJsonString(trimmed);
    if (jsonParsed !== null) return jsonParsed;

    return rawContent;
};

// --- Helpers for localizeStoryQuestion ---

function resolveStringFallback(parsedQuestion: string, lang: string, isEnglish: boolean, fallbackKey?: string): string {
    if (parsedQuestion.trim() === '') return parsedQuestion;
    
    // If we have a fallback key, check if this string is just the English version of that fallback
    if (fallbackKey && !isEnglish) {
        const englishDefault = i18next.t(fallbackKey, { lng: 'en' });
        if (parsedQuestion === englishDefault) {
            // It's just the default English string, so we should try to find a better translation
            const localizedDefault = i18next.t(fallbackKey, { lng: lang });
            if (localizedDefault && localizedDefault !== fallbackKey) {
                return localizedDefault;
            }
        }
    }
    return parsedQuestion;
}

export const localizeStoryQuestion = (
    question: unknown,
    lang: string,
    fallbackKey?: string,
    defaultLocale?: string
): string => {
    const parsedQuestion = safeParseStoryQuestion(question);
    const normLang = normalizeLocaleCode(lang) || 'en';
    const isEnglish = normLang === 'en';
    
    // If it's a Record (multi-language), use the unified getLocalizedValue resolver
    if (typeof parsedQuestion === 'object' && parsedQuestion !== null) {
        const resolved = getLocalizedValue(parsedQuestion, normLang, defaultLocale);
        if (resolved && typeof resolved === 'string' && resolved.trim() !== '') {
            return resolved;
        }
        // Fallback to fallbackKey or empty string if not found in chain (effective -> default -> en)
    }
    
    // Handle string inputs (detecting if they are just the English default)
    if (typeof parsedQuestion === 'string') {
        const resolved = resolveStringFallback(parsedQuestion, normLang, isEnglish, fallbackKey);
        if (resolved.trim() !== '') return resolved;
    }
    
    // If we've reached here and have no better option, use the i18next fallback
    if (fallbackKey) {
        const i18nVal = i18next.t(fallbackKey, { lng: normLang });
        if (i18nVal && i18nVal !== fallbackKey) return i18nVal;
    }
    
    return "";
};

export const localizeSliderQuestion = (
    q: SliderQuestion,
    lang: string,
    defaultLocale?: string
): SliderQuestion => {
    const normLang = normalizeLocaleCode(lang) || 'en';
    const translation = getLocalizedValue(q.translations, normLang, defaultLocale);
    if (!translation) return q;

    return {
        ...q,
        theme: translation.theme || q.theme,
        question: translation.question || q.question,
        leftLabel: translation.leftLabel || q.leftLabel,
        rightLabel: translation.rightLabel || q.rightLabel
    };
};

export const localizeTriangleQuestion = (
    q: TriangleQuestion,
    lang: string,
    defaultLocale?: string
): TriangleQuestion => {
    const normLang = normalizeLocaleCode(lang) || 'en';
    const translation = getLocalizedValue(q.translations, normLang, defaultLocale);
    if (!translation) return q;

    return {
        ...q,
        theme: translation.theme || q.theme,
        question: translation.question || q.question,
        topLabel: translation.topLabel || q.topLabel,
        bottomLeftLabel: translation.bottomLeftLabel || q.bottomLeftLabel,
        bottomRightLabel: translation.bottomRightLabel || q.bottomRightLabel
    };
};

export const localizeParticipantQuestion = (
    q: ParticipantQuestion,
    lang: string,
    defaultLocale?: string
): ParticipantQuestion => {
    const normLang = normalizeLocaleCode(lang) || 'en';
    const questionTranslation = getLocalizedValue(q.translations, normLang, defaultLocale);
    
    // Localize choices
    const localizedChoices = (q.choices || []).map(choice => {
        // Special case for our injected system string
        if (choice.id === 'prefer-not-to-say') {
            return {
                ...choice,
                label: getPreferNotToSayLabel(normLang)
            };
        }

        const choiceWithTrans = choice as { translations?: Record<string, string> };
        const choiceTranslation = getLocalizedValue(choiceWithTrans.translations, normLang, defaultLocale);
        if (!choiceTranslation) return choice;
        return {
            ...choice,
            label: choiceTranslation
        };
    });

    return {
        ...q,
        label: questionTranslation || q.label,
        choices: localizedChoices
    };
};
