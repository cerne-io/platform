import { describe, it, expect } from "vitest";
import { getLanguageName, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGES } from "./languages";

describe("getLanguageName", () => {
  it("returns correct name for known codes", () => {
    expect(getLanguageName("en")).toBe("English");
    expect(getLanguageName("pt-BR")).toBe("Portuguese (Brazil)");
    expect(getLanguageName("es")).toBe("Spanish");
    expect(getLanguageName("fr")).toBe("French");
    expect(getLanguageName("de")).toBe("German");
    expect(getLanguageName("it")).toBe("Italian");
    expect(getLanguageName("nl")).toBe("Dutch");
  });

  it("returns the code itself for unknown codes", () => {
    expect(getLanguageName("ja")).toBe("ja");
    expect(getLanguageName("xx-YY")).toBe("xx-YY");
  });
});

describe("SUPPORTED_LANGUAGES", () => {
  it("contains all 7 expected languages", () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(7);
    const codes = SUPPORTED_LANGUAGES.map(l => l.code);
    expect(codes).toEqual(["en", "pt-BR", "es", "fr", "de", "it", "nl"]);
  });

  it("each language has code, name, and flag", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(lang.code).toBeTruthy();
      expect(lang.name).toBeTruthy();
      expect(lang.flag).toBeTruthy();
    }
  });
});

describe("DEFAULT_LANGUAGES", () => {
  it("has en as default language", () => {
    expect(DEFAULT_LANGUAGES.defaultLanguage).toBe("en");
  });

  it("has en as sole enabled language", () => {
    expect(DEFAULT_LANGUAGES.enabledLanguages).toEqual(["en"]);
  });
});
