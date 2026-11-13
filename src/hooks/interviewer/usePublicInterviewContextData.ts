import { useState, useEffect } from "react";
import { useProjectIdResolver } from "@/hooks/collect/useProjectIdResolver";
import { formLanguageService, ProjectLanguages } from "@/services/formLanguageService";
import { getPublicForm } from "@/services/publicFormService";
import { debugError } from "@/utils/debugLogger";

export const DEFAULT_APPLICATION_LANGUAGES: ProjectLanguages = {
  enabledLanguages: [],
  defaultLanguage: 'en',
};

export interface UsePublicInterviewContextDataOptions {
  directProjectId?: string;
  formId?: string;
}

export interface UsePublicInterviewContextDataResult {
  projectId: string | null | undefined;
  resolverLoading: boolean;
  resolverError: string | null;
  rawContextData: Record<string, unknown> | null;
  contextLoading: boolean;
  langConfig: ProjectLanguages | null;
  langConfigLoaded: boolean;
  configError: Error | null;
  handleRetryConfigLoad: () => void;
}

/**
 * Hook to resolve project ID, load language configuration, and fetch
 * public project context data for the public interviewer.
 */
export const usePublicInterviewContextData = ({
  directProjectId,
  formId,
}: UsePublicInterviewContextDataOptions): UsePublicInterviewContextDataResult => {
  const [rawContextData, setRawContextData] = useState<Record<string, unknown> | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [langConfig, setLangConfig] = useState<ProjectLanguages | null>(null);
  const [langConfigLoaded, setLangConfigLoaded] = useState(false);
  const [configError, setConfigError] = useState<Error | null>(null);
  const [configRetryCount, setConfigRetryCount] = useState(0);

  // Resolve formId to projectId (skip if directProjectId is provided)
  const { projectId: resolvedProjectId, loading: resolverLoading, error: resolverError } = useProjectIdResolver(
    true,
    directProjectId ? null : formId
  );

  const projectId = directProjectId || resolvedProjectId;

  // Fetch language configuration and public project form data
  useEffect(() => {
    if (!projectId) return;

    let isCancelled = false;
    const loadPublicData = async () => {
      setContextLoading(true);
      try {
        const [publicData, fallbackLangConfig] = await Promise.all([
          getPublicForm(projectId, formId),
          formId ? Promise.resolve(null) : formLanguageService.getLanguageConfig(projectId),
        ]);

        if (!isCancelled) {
          const resolvedLang = (publicData?.languages as ProjectLanguages | undefined) || fallbackLangConfig;
          setLangConfig(resolvedLang || DEFAULT_APPLICATION_LANGUAGES);
          setLangConfigLoaded(true);
          setConfigError(null);

          setRawContextData(
            publicData
              ? {
                  storyQuestion: publicData.storyQuestion,
                  sliderQuestions: publicData.sliderQuestions,
                  triangleQuestions: publicData.triangleQuestions,
                  participantQuestions: publicData.participantQuestions,
                  questionType: publicData.questionType,
                  headerText: publicData.headerText,
                  subheaderText: publicData.subheaderText,
                }
              : {}
          );
        }
      } catch (err: unknown) {
        debugError("Error loading public interview data:", err);
        if (!isCancelled) {
          // Failure must not silently become DEFAULT_APPLICATION_LANGUAGES
          setConfigError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!isCancelled) {
          setContextLoading(false);
        }
      }
    };

    void loadPublicData();
    return () => { isCancelled = true; };
  }, [projectId, formId, configRetryCount]);

  const handleRetryConfigLoad = () => {
    setConfigError(null);
    setConfigRetryCount((c) => c + 1);
  };

  return {
    projectId,
    resolverLoading,
    resolverError,
    rawContextData,
    contextLoading,
    langConfig,
    langConfigLoaded,
    configError,
    handleRetryConfigLoad,
  };
};
