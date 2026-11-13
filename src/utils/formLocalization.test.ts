import { describe, it, expect, vi } from "vitest";
import { 
    safeParseStoryQuestion, 
    localizeStoryQuestion, 
    localizeSliderQuestion, 
    localizeTriangleQuestion, 
    localizeParticipantQuestion 
} from "./formLocalization";

vi.mock("i18next", () => ({
  default: {
    t: vi.fn((key: string, options?: { lng: string }) => {
      // Mock translations for testing
      if (key === "public.form.prefer_not_to_say") {
        return options?.lng === "es" ? "Prefiero no decirlo" : "Prefer not to say";
      }
      if (key === "fallback.key") {
        return options?.lng === "es" ? "Fallback ES" : "Fallback EN";
      }
      return key; // return key if no mock translation
    }),
  },
}));

describe("formLocalization", () => {
    describe("safeParseStoryQuestion", () => {
        it("returns empty string for null/undefined", () => {
            expect(safeParseStoryQuestion(null)).toBe("");
            expect(safeParseStoryQuestion(undefined)).toBe("");
        });

        it("returns original object if it's already an object without nested storyQuestion", () => {
            const obj = { en: "Hello", es: "Hola" };
            expect(safeParseStoryQuestion(obj)).toEqual(obj);
        });

        it("extracts nested storyQuestion if present", () => {
            const obj = { storyQuestion: { en: "Nested" } };
            expect(safeParseStoryQuestion(obj)).toEqual({ en: "Nested" });
        });

        it("returns empty string for empty string input", () => {
            expect(safeParseStoryQuestion("   ")).toBe("");
        });

        it("parses valid JSON string", () => {
            expect(safeParseStoryQuestion('{"en":"JSON Hello"}')).toEqual({ en: "JSON Hello" });
        });

        it("strips quotes but falls back to raw string if internal slashes aren't unescaped", () => {
            const input = '"{\\"en\\":\\"JSON Quoted\\"}"';
            expect(safeParseStoryQuestion(input)).toBe(input);
        });

        it("returns raw string if JSON parsing fails", () => {
            const invalidJson = "{en: 'No quotes'}";
            expect(safeParseStoryQuestion(invalidJson)).toBe(invalidJson);
        });
        
        it("handles non-string primitives", () => {
            expect(safeParseStoryQuestion(123)).toBe("123");
        });
    });

    describe("localizeStoryQuestion", () => {
        it("returns specific language from Record", () => {
            const question = { en: "Hello", es: "Hola", fr: "Bonjour" };
            expect(localizeStoryQuestion(question, "es")).toBe("Hola");
        });

        it("falls back to English if requested language missing in Record", () => {
            const question = { en: "Hello", fr: "Bonjour" };
            expect(localizeStoryQuestion(question, "es")).toBe("Hello");
        });

        it("returns empty string with deterministic missing-content handling if neither requested, form default, nor English exists", () => {
            const question = { fr: "Bonjour", de: "Guten Tag" };
            expect(localizeStoryQuestion(question, "es")).toBe("");
        });

        it("resolves string fallback when string matches English default but requested is non-English", () => {
            // "Fallback EN" matches the mock return for i18next.t("fallback.key", { lng: 'en' })
            expect(localizeStoryQuestion("Fallback EN", "es", "fallback.key")).toBe("Fallback ES");
        });

        it("returns original string if it doesn't match the English fallback", () => {
            expect(localizeStoryQuestion("Custom text", "es", "fallback.key")).toBe("Custom text");
        });

        it("uses i18next fallback key directly if input is completely empty", () => {
            expect(localizeStoryQuestion("", "es", "fallback.key")).toBe("Fallback ES");
        });
    });

    describe("localizeSliderQuestion", () => {
        it("localizes slider questions when translation exists", () => {
            const q = {
                id: "q1",
                question: "Q EN",
                leftLabel: "Left EN",
                rightLabel: "Right EN",
                theme: "Theme EN",
                translations: {
                    es: {
                        question: "Q ES",
                        leftLabel: "Left ES",
                        rightLabel: "Right ES",
                        theme: "Theme ES"
                    }
                }
            } as never;
            
            const loc = localizeSliderQuestion(q, "es");
            expect(loc.question).toBe("Q ES");
            expect(loc.leftLabel).toBe("Left ES");
            expect(loc.rightLabel).toBe("Right ES");
            expect(loc.theme).toBe("Theme ES");
        });

        it("falls back to defaults for missing translation fields", () => {
            const q = {
                id: "q1",
                question: "Q EN",
                leftLabel: "Left EN",
                rightLabel: "Right EN",
                theme: "Theme EN",
                translations: {
                    es: {
                        question: "Q ES"
                    }
                }
            } as never;
            
            const loc = localizeSliderQuestion(q, "es");
            expect(loc.question).toBe("Q ES");
            expect(loc.leftLabel).toBe("Left EN");
        });
    });

    describe("localizeTriangleQuestion", () => {
        it("localizes triangle questions", () => {
            const q = {
                id: "t1",
                question: "Q EN",
                topLabel: "Top EN",
                bottomLeftLabel: "BL EN",
                bottomRightLabel: "BR EN",
                theme: "Theme EN",
                translations: {
                    es: {
                        question: "Q ES",
                        topLabel: "Top ES",
                        bottomLeftLabel: "BL ES",
                        bottomRightLabel: "BR ES",
                        theme: "Theme ES"
                    }
                }
            } as never;

            const loc = localizeTriangleQuestion(q, "es");
            expect(loc.question).toBe("Q ES");
            expect(loc.topLabel).toBe("Top ES");
            expect(loc.bottomLeftLabel).toBe("BL ES");
            expect(loc.bottomRightLabel).toBe("BR ES");
        });
    });

    describe("localizeParticipantQuestion", () => {
        it("localizes participant questions and choices", () => {
            const q = {
                id: "p1",
                label: "Label EN",
                choices: [
                    { id: "c1", label: "Choice 1 EN", translations: { es: "Choice 1 ES" } },
                    { id: "c2", label: "Choice 2 EN" }, // no translation
                    { id: "prefer-not-to-say", label: "Prefer not to say" } // system translation
                ],
                translations: {
                    es: "Label ES"
                }
            } as never;

            const loc = localizeParticipantQuestion(q, "es");
            expect(loc.label).toBe("Label ES");
            expect(loc.choices[0].label).toBe("Choice 1 ES");
            expect(loc.choices[1].label).toBe("Choice 2 EN"); // falls back
            expect(loc.choices[2].label).toBe("Prefiero no decirlo"); // Uses i18next mock
        });

        it("resolves dialect mapping pt-BR <-> pt and defaultLocale fallback", () => {
            const q = {
                id: "p1",
                label: "Original Label",
                choices: [
                    { id: "prefer-not-to-say", label: "Prefer not to say" }
                ],
                translations: {
                    pt: "Rótulo em Português"
                }
            } as never;

            const loc = localizeParticipantQuestion(q, "pt-BR");
            expect(loc.label).toBe("Rótulo em Português");
            expect(loc.choices[0].label).toBe("Prefiro não dizer");
        });
    });
});
