import React from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  usePublicInterviewContextData,
  DEFAULT_APPLICATION_LANGUAGES,
} from "@/hooks/interviewer/usePublicInterviewContextData";
import { usePublicInterviewLocale } from "@/hooks/interviewer/usePublicInterviewLocale";
import PublicInterviewerSession from "@/components/public-interviewer/PublicInterviewerSession";

interface PublicInterviewerProps {
  projectId?: string; // Optional prop for direct injection (Custom Domains)
}

/**
 * PublicInterviewer Controller:
 * Gated lifecycle that enforces form-locale single source of truth and prevents interview
 * initialization until language configuration and translation resources are loaded.
 */
const PublicInterviewer: React.FC<PublicInterviewerProps> = ({ projectId: directProjectId }) => {
  const { t } = useTranslation('translation', { keyPrefix: 'public' });
  const { formId } = useParams<{ formId: string }>();

  const {
    projectId,
    resolverLoading,
    resolverError,
    rawContextData,
    contextLoading,
    langConfig,
    langConfigLoaded,
    configError,
    handleRetryConfigLoad,
  } = usePublicInterviewContextData({ directProjectId, formId });

  const {
    committedLocale,
    isSwitchingLocale,
    initError,
    handleLanguageChange,
    handleRetryLocaleLoad,
  } = usePublicInterviewLocale({
    projectId,
    langConfig,
    langConfigLoaded,
  });

  // Resolver error state
  if (resolverError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md bg-card border border-destructive/30 rounded-xl p-8 shadow-xs text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h2 className="font-heading font-bold text-2xl text-foreground tracking-[-0.02em]">{t('error.load', 'Unable to load interview')}</h2>
          <p className="text-sm text-muted-foreground">{resolverError}</p>
        </div>
      </div>
    );
  }

  // Configuration failure gate (unrecoverable without retry)
  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md bg-card border border-destructive/30 rounded-xl p-8 shadow-xs text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h2 className="font-heading font-bold text-2xl text-foreground tracking-[-0.02em]">Failed to load interview configuration</h2>
          <p className="text-sm text-muted-foreground">{configError.message || 'Unable to retrieve form configuration.'}</p>
          <Button onClick={handleRetryConfigLoad} variant="outline" size="sm" className="active:scale-[0.98] shadow-xs">
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  // Locale loading failure gate (unrecoverable without retry on initial load)
  if (!committedLocale && initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md bg-card border border-destructive/30 rounded-xl p-8 shadow-xs text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h2 className="font-heading font-bold text-2xl text-foreground tracking-[-0.02em]">Failed to load translation resources</h2>
          <p className="text-sm text-muted-foreground">{initError.message}</p>
          <Button onClick={handleRetryLocaleLoad} variant="outline" size="sm" className="active:scale-[0.98] shadow-xs">
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  // READINESS GATE:
  // Only block rendering BEFORE the first successful initialization!
  // Once committedLocale is set, PublicInterviewerSession remains in the tree across language switches.
  const isInitialReady =
    !resolverLoading &&
    !contextLoading &&
    langConfigLoaded &&
    committedLocale !== null &&
    !!projectId;

  if (!isInitialReady) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm font-medium">{t('loading', 'Loading interview...')}</span>
        </div>
      </div>
    );
  }

  // Session mount: keyed by formId or projectId so active interview state is PRESERVED when switching languages
  return (
    <PublicInterviewerSession
      key={formId || projectId}
      projectId={projectId!}
      formId={formId}
      effectiveLocale={committedLocale!}
      defaultLocale={langConfig?.defaultLanguage || 'en'}
      langConfig={langConfig || DEFAULT_APPLICATION_LANGUAGES}
      rawContextData={rawContextData}
      onLanguageChange={handleLanguageChange}
      isSwitchingLocale={isSwitchingLocale}
    />
  );
};

export default PublicInterviewer;
