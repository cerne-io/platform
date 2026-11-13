import { debugError } from "@/utils/debugLogger";
import React, { useEffect } from "react";
import StoryQuestionGenerator from "./StoryQuestionGenerator";
import AssistantResponse from "./AssistantResponse";
import { clearFormDataCache } from "@/services/cache/formDataCache";

interface StoryQuestionEditorProps {
  loading: boolean;
  error: string | null;
  response: string;
  hasEverSavedQuestion: boolean;
  isEditing: boolean;
  currentQuestion: string | Record<string, string> | null;
  onGenerateQuestion: (e: React.MouseEvent) => void;
  onSaveQuestion: (question: string | Record<string, string>) => Promise<void>;
  onAcceptImprovement: (question: string | Record<string, string>, savedToDb?: boolean) => void;
  projectId?: string;
  forceEditMode?: boolean;
  onManualStart?: () => void;
  onCancelEdit?: () => void;
}

import { debugLog } from "@/utils/debugLogger";
import { formLanguageService, ProjectLanguages, DEFAULT_LANGUAGES } from "@/services/formLanguageService";
import LanguageTabs from "./shared/LanguageTabs";
import AutoTranslateButton from "./shared/AutoTranslateButton";


const StoryQuestionEditor: React.FC<StoryQuestionEditorProps> = ({
  loading,
  error,
  response,
  hasEverSavedQuestion,
  isEditing,
  currentQuestion,
  onGenerateQuestion,
  onSaveQuestion,
  onAcceptImprovement,
  projectId,
  forceEditMode = false,
  onManualStart,
  onCancelEdit
}) => {
  const [langConfig, setLangConfig] = React.useState<ProjectLanguages>(DEFAULT_LANGUAGES);
  const [activeLang, setActiveLang] = React.useState<string>('en');
  const [isLangsLoading, setIsLangsLoading] = React.useState(true);
  const [draftTranslations, setDraftTranslations] = React.useState<Record<string, string>>({});

  // Load language settings
  useEffect(() => {
    const loadLangs = async () => {
      if (!projectId) {
        setIsLangsLoading(false);
        return;
      }
      try {
        const config = await formLanguageService.getLanguageConfig(projectId);
        setLangConfig(config);
        setActiveLang(config.defaultLanguage || 'en');
      } catch (error) {
        debugError("[StoryQuestionEditor] Error loading languages:", error);
      } finally {
        setIsLangsLoading(false);
      }
    };
    void loadLangs();
  }, [projectId]);

  // Sync draft with currentQuestion from props if it changes
  useEffect(() => {
    if (currentQuestion) {
      if (typeof currentQuestion === 'object' && !Array.isArray(currentQuestion)) {
        setDraftTranslations(currentQuestion as Record<string, string>);
      } else if (typeof currentQuestion === 'string' && currentQuestion.trim().length > 0) {
        setDraftTranslations({ [langConfig.defaultLanguage || 'en']: currentQuestion });
      }
    }
  }, [currentQuestion, langConfig.defaultLanguage]);

  // Use draftTranslations state
  const translations = draftTranslations;

  // Get current text for the active language
  const activeTranslation = translations[activeLang] || "";

  // Helper to update translations draft locally
  const handleUpdateDraft = (text: string) => {
    setDraftTranslations(prev => ({
      ...prev,
      [activeLang]: text
    }));
  };

  // Determine what to display based on state
  const shouldShowGenerator = (!hasEverSavedQuestion || isEditing) && !response && !activeTranslation && !forceEditMode;
  const shouldShowResponse = response || activeTranslation || forceEditMode;

  // Listen for story question saved events to refresh form cache
  useEffect(() => {
    const handleStoryQuestionSaved = (event: CustomEvent) => {
      if (projectId && event.detail?.projectId === projectId) {
        debugLog("StoryQuestionEditor detected story_question_saved event, clearing form cache");
        try {
          clearFormDataCache(projectId, 'form_data');
        } catch (error) {
          debugError("Error clearing cache on story question save event:", error);
        }
      }
    };

    window.addEventListener('story_question_saved', handleStoryQuestionSaved as EventListener);
    return () => {
      window.removeEventListener('story_question_saved', handleStoryQuestionSaved as EventListener);
    };
  }, [projectId]);

  // Debug logging to track component state
  useEffect(() => {
    debugLog("StoryQuestionEditor state:", {
      loading,
      error,
      responseLength: response?.length,
      responsePreview: response?.substring(0, 30),
      currentQuestionLength: typeof currentQuestion === 'string' ? currentQuestion.length : JSON.stringify(currentQuestion).length,
      currentQuestionPreview: typeof currentQuestion === 'string' ? currentQuestion.substring(0, 30) : JSON.stringify(currentQuestion).substring(0, 30),
      shouldShowGenerator,
      shouldShowResponse,
      hasEverSavedQuestion,
      isEditing,
      projectId
    });
  }, [loading, error, response, currentQuestion, shouldShowGenerator, shouldShowResponse, hasEverSavedQuestion, isEditing, projectId]);

  // Special save handler that ensures proper caching
  const handleSaveQuestion = async (question: string | Record<string, string>): Promise<void> => {
    debugLog("[StoryQuestionEditor] Saving question:", question);
    
    if (projectId) {
      // Clear form cache before save
      try {
        clearFormDataCache(projectId, 'form_data');
      } catch (error) {
        debugError("Error clearing cache before save:", error);
      }
    }

    // Call the original save function
    await onSaveQuestion(question);
  };

  const handleImprovedQuestion = (improvedQuestion: string | Record<string, string>) => {
    debugLog("[StoryQuestionEditor] Handling improved question for language:", activeLang);
    
    if (typeof improvedQuestion === 'string') {
      const updated = {
        ...draftTranslations,
        [activeLang]: improvedQuestion
      };
      onAcceptImprovement(updated);
    } else {
      // If it's already an object, pass it directly
      onAcceptImprovement(improvedQuestion);
    }
  };

  return (
    <div className="space-y-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 italic font-serif">Story Question</h3>
      </div>

      {!isLangsLoading && langConfig.enabledLanguages.length > 1 && (
        <div className="mb-2">
          <LanguageTabs 
            enabledLanguages={langConfig.enabledLanguages}
            activeLanguage={activeLang}
            onLanguageChange={setActiveLang}
            translations={translations}
            rightElement={
              <AutoTranslateButton 
                content={translations[langConfig.defaultLanguage] || ""}
                targetLanguages={langConfig.enabledLanguages}
                sourceLanguage={langConfig.defaultLanguage}
                onTranslationComplete={(newTranslations) => {
                  const updated = { ...translations, ...newTranslations };
                  setDraftTranslations(updated);
                  if (onManualStart) {
                    onManualStart();
                  }
                }}
              />
            }
          />
        </div>
      )}

      {/* Show the StoryQuestionGenerator when we don't have a response or question */}
      {shouldShowGenerator && (
        <StoryQuestionGenerator
          loading={loading}
          error={error}
          onGenerate={onGenerateQuestion}
          onManualStart={onManualStart}
        />
      )}

          <AssistantResponse
            key={activeLang}
            response={response || activeTranslation || ''}
            mode="storyQuestion"
            onSaveQuestion={async (questionText) => {
              let questionToSave: string | Record<string, string> = draftTranslations;
              
              if (typeof questionText === 'string') {
                questionToSave = {
                  ...draftTranslations,
                  [activeLang]: questionText
                };
                setDraftTranslations(questionToSave as Record<string, string>);
              } else if (questionText && typeof questionText === 'object') {
                questionToSave = questionText;
                setDraftTranslations(questionToSave as Record<string, string>);
              }
              
              await handleSaveQuestion(questionToSave); 
            }}
            onChange={handleUpdateDraft}
            onAcceptImprovement={handleImprovedQuestion}
            currentQuestion={activeTranslation}
            forceEditMode={forceEditMode}
            onCancelEdit={onCancelEdit}
          />

      {/* Display error if present */}
      {error && (
        <div className="text-red-500 text-sm mt-2 p-2 bg-red-50 border border-red-100 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default StoryQuestionEditor;
