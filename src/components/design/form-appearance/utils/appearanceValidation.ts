import { debugLog } from "@/utils/debugLogger";
import { FormAppearance, defaultAppearance } from "../types";

const safeParseLocalizedText = (value: unknown): string | Record<string, string> => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    // Check if it's a Record<string, string>
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length > 0 && keys.every(k => typeof obj[k] === 'string')) {
      return obj as Record<string, string>;
    }
  }
  return "";
};

export const validateAppearanceData = (data: unknown): FormAppearance => {
  // Check if data is valid
  if (!data || typeof data !== 'object') {
    debugLog("Invalid appearance data format, using defaults");
    return { ...defaultAppearance };
  }

  const safeData = data as Record<string, unknown>;

  const validatedAppearance: FormAppearance = {
    backgroundColor: typeof safeData.backgroundColor === 'string' && safeData.backgroundColor
      ? safeData.backgroundColor
      : defaultAppearance.backgroundColor,
    logoUrl: typeof safeData.logoUrl === 'string'
      ? safeData.logoUrl
      : defaultAppearance.logoUrl,
    headerText: safeData.headerText ? safeParseLocalizedText(safeData.headerText) || defaultAppearance.headerText : defaultAppearance.headerText,
    subheaderText: safeData.subheaderText ? safeParseLocalizedText(safeData.subheaderText) : defaultAppearance.subheaderText
  };

  return validatedAppearance;
};
