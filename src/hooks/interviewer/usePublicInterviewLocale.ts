import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProjectLanguages } from "@/services/formLanguageService";
import {
  resolveEffectiveLocale,
  parseSupportedLanguage,
  SupportedLanguage,
} from "@/utils/localeResolution";
import { debugError } from "@/utils/debugLogger";

export interface UsePublicInterviewLocaleOptions {
  projectId: string | null | undefined;
  langConfig: ProjectLanguages | null;
  langConfigLoaded: boolean;
}

export interface UsePublicInterviewLocaleResult {
  committedLocale: SupportedLanguage | null;
  targetLocale: SupportedLanguage;
  isSwitchingLocale: boolean;
  initError: Error | null;
  handleLanguageChange: (lang: string) => void;
  handleRetryLocaleLoad: () => void;
}

/**
 * Hook to manage locale precedence resolution, gated dynamic i18n bundle loading,
 * error recovery/retry, and non-destructive locale switching for public interviewer sessions.
 */
export const usePublicInterviewLocale = ({
  projectId,
  langConfig,
  langConfigLoaded,
}: UsePublicInterviewLocaleOptions): UsePublicInterviewLocaleResult => {
  const { i18n } = useTranslation('translation', { keyPrefix: 'public' });
  const [searchParams, setSearchParams] = useSearchParams();
  const [userSelectedLang, setUserSelectedLang] = useState<string | null>(null);

  const [committedLocale, setCommittedLocale] = useState<SupportedLanguage | null>(null);
  const [isSwitchingLocale, setIsSwitchingLocale] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);
  const [localeRetryCount, setLocaleRetryCount] = useState(0);

  // Resolve effective locale using strict precedence
  const targetLocale = useMemo(() => {
    return resolveEffectiveLocale({
      userSelection: userSelectedLang,
      urlParam: searchParams.get('lang'),
      formLanguages: langConfigLoaded ? langConfig : null,
      appFallback: 'en'
    });
  }, [userSelectedLang, searchParams, langConfigLoaded, langConfig]);

  // Separated Lifecycle: Initial Gated Loading vs Subsequent Locale Switch
  useEffect(() => {
    if (!projectId || !langConfigLoaded) return;

    let isCancelled = false;

    // Phase A: Initial initialization before session is mounted
    if (!committedLocale) {
      const initLocale = async () => {
        try {
          const activeI18n = (await import("@/i18n")).default || i18n;
          if (typeof activeI18n.loadLanguages === 'function') {
            await activeI18n.loadLanguages([targetLocale]);
          }
          // Dynamic fallback for fixed UI keys: effective -> form default -> en
          const formDefault = parseSupportedLanguage(langConfig?.defaultLanguage);
          if (activeI18n?.options) {
            if (formDefault && formDefault !== 'en') {
              activeI18n.options.fallbackLng = [formDefault, 'en'];
            } else {
              activeI18n.options.fallbackLng = 'en';
            }
          }
          await activeI18n.changeLanguage(targetLocale);

          if (!isCancelled) {
            setCommittedLocale(targetLocale);
            setInitError(null);
          }
        } catch (err: unknown) {
          debugError("Failed to load initial locale bundle for:", targetLocale, err);
          const formDefault = parseSupportedLanguage(langConfig?.defaultLanguage);
          const fallbackLocale = formDefault || 'en';

          // When the failed target already equals the fallback locale,
          // do NOT treat it as a successful fallback and do NOT commit it.
          // Show the retryable error immediately.
          if (fallbackLocale === targetLocale) {
            if (!isCancelled) {
              setInitError(err instanceof Error ? err : new Error(String(err)));
            }
            return;
          }

          // Otherwise attempt fallback preparation
          try {
            const activeI18n = (await import("@/i18n")).default || i18n;
            if (typeof activeI18n.loadLanguages === 'function') {
              await activeI18n.loadLanguages([fallbackLocale]);
            }
            await activeI18n.changeLanguage(fallbackLocale);
            if (!isCancelled) {
              setCommittedLocale(fallbackLocale);
              setInitError(null);
            }
          } catch (fallbackErr) {
            debugError("Failed to load fallback locale:", fallbackLocale, fallbackErr);
            if (!isCancelled) {
              setInitError(fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)));
            }
          }
        }
      };

      void initLocale();
      return () => { isCancelled = true; };
    }

    // Phase B: Subsequent locale change (session is ALREADY mounted and stays mounted)
    if (committedLocale && targetLocale !== committedLocale) {
      const switchLocale = async () => {
        setIsSwitchingLocale(true);
        try {
          const activeI18n = (await import("@/i18n")).default || i18n;
          if (typeof activeI18n.loadLanguages === 'function') {
            await activeI18n.loadLanguages([targetLocale]);
          }
          await activeI18n.changeLanguage(targetLocale);
          if (!isCancelled) {
            setCommittedLocale(targetLocale);
            setIsSwitchingLocale(false);
          }
        } catch (err: unknown) {
          debugError("Failed to switch locale to:", targetLocale, err);
          if (!isCancelled) {
            // Keep existing session mounted on committedLocale
            setIsSwitchingLocale(false);
            setUserSelectedLang(committedLocale);
          }
        }
      };

      void switchLocale();
      return () => { isCancelled = true; };
    }
  }, [
    projectId,
    langConfigLoaded,
    targetLocale,
    committedLocale,
    langConfig?.defaultLanguage,
    i18n,
    localeRetryCount
  ]);

  const handleLanguageChange = (lang: string) => {
    setUserSelectedLang(lang);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('lang', lang);
    setSearchParams(newParams, { replace: true });
  };

  const handleRetryLocaleLoad = () => {
    setInitError(null);
    setLocaleRetryCount((c) => c + 1);
  };

  return {
    committedLocale,
    targetLocale,
    isSwitchingLocale,
    initError,
    handleLanguageChange,
    handleRetryLocaleLoad,
  };
};
