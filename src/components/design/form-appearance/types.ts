
export interface FormAppearance {
  backgroundColor: string;
  logoUrl: string;
  headerText: string | Record<string, string>;
  subheaderText: string | Record<string, string>;
}

export const defaultAppearance: FormAppearance = {
  backgroundColor: "#f8f9fa",
  logoUrl: "",
  headerText: "Share Your Story",
  subheaderText: "Help us understand your experience by sharing your story below."
};

export const validateAppearanceData = (data: unknown): FormAppearance => {
  if (!data || typeof data !== 'object') {
    return { ...defaultAppearance };
  }

  const safeData = data as Record<string, unknown>;

  const validateText = (val: unknown, fallback: string): string | Record<string, string> => {
    if (typeof val === 'string' && val.trim().length > 0) return val;
    if (typeof val === 'object' && val !== null) return val as Record<string, string>;
    return fallback;
  };

  return {
    backgroundColor: typeof safeData.backgroundColor === 'string' && safeData.backgroundColor
      ? safeData.backgroundColor
      : defaultAppearance.backgroundColor,
    logoUrl: typeof safeData.logoUrl === 'string'
      ? safeData.logoUrl
      : defaultAppearance.logoUrl,
    headerText: validateText(safeData.headerText, defaultAppearance.headerText as string),
    subheaderText: validateText(safeData.subheaderText, defaultAppearance.subheaderText as string)
  };
};
