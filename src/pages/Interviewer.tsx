import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Download, RotateCcw, Loader2 } from "lucide-react";
import { useInterviewer } from "@/hooks/useInterviewer";
import InterviewerMessageList from "@/components/public-interviewer/InterviewerMessageList";
import InterviewerInputBar from "@/components/public-interviewer/InterviewerInputBar";
import FormDesignRequired from "@/components/collect/FormDesignRequired";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useInterviewerPageData } from "@/hooks/useInterviewerPageData";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { formLanguageService, ProjectLanguages, DEFAULT_LANGUAGES } from "@/services/formLanguageService";
import LanguageSelector from "@/components/form/LanguageSelector";
import { 
  localizeStoryQuestion, 
  localizeSliderQuestion, 
  localizeTriangleQuestion, 
  localizeParticipantQuestion 
} from "@/utils/formLocalization";

const Interviewer = () => {
  const { t } = useTranslation();
  const { projectId } = useParams();

  const [inputValue, setInputValue] = useState("");
  const [activeLang, setActiveLang] = useState<string>(i18n.language || 'en');
  const [langConfig, setLangConfig] = useState<ProjectLanguages>(DEFAULT_LANGUAGES);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    projectContext,
    contextLoading,
    sliderQuestions,
    triangleQuestions,
    participantQuestions,
    isValidating,
    hasFormIntegrity,
    hasStoryQuestion,
    hasSliderQuestions,
    hasTriangleQuestions,
    hasParticipantQuestions,
    savedQuestion,
    storyLoading,
  } = useInterviewerPageData(projectId);

  // Fetch language configuration
  useEffect(() => {
    if (projectId) {
      void formLanguageService.getLanguageConfig(projectId).then(config => {
        setLangConfig(config);
        
        // Use default language from project if not set
        if (!activeLang || activeLang === 'en') {
           setActiveLang(config.defaultLanguage);
           void i18n.changeLanguage(config.defaultLanguage);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Handle language change
  const handleLanguageChange = (lang: string) => {
    setActiveLang(lang);
    void i18n.changeLanguage(lang);
  };

  // Set up interviewer hook with project context and story question
  const {
    storyHasBeenSaved,
    saveError,
    isSaving,
    retrySave,
    messages,
    isLoading,
    isThinking,
    error,
    isInterviewStarted,
    currentPhase,
    startInterview,
    sendMessage,
    clearInterview,
    exportConversation,
    handleSliderSubmit,
    handleSliderSkip,
    handleTriangleSubmit,
    handleTriangleSkip,
    handleParticipantSubmit,
    handleParticipantSkip,
    handleEmotionSelect
  } = useInterviewer({
    projectContext,
    storyQuestion: localizeStoryQuestion(savedQuestion, activeLang),
    projectId,
    sliderQuestions: (sliderQuestions || []).map(q => localizeSliderQuestion(q, activeLang)),
    triangleQuestions: (triangleQuestions || []).map(q => localizeTriangleQuestion(q, activeLang)),
    participantQuestions: (participantQuestions || []).map(q => localizeParticipantQuestion(q, activeLang)),
    language: activeLang
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      const scrollArea = messagesEndRef.current.closest('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, [messages, isLoading, isThinking]);
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    const draft = inputValue;
    setInputValue("");
    const success = await sendMessage(draft);
    if (success === false) {
      setInputValue(draft);
    }
  };
  const handleStartInterview = () => {
    if (savedQuestion) {
      void startInterview();
    }
  };
  const isReady = !contextLoading && !storyLoading && !!savedQuestion;

  // If validating design, show loading state
  if (isValidating) {
    return (
      <div className="container mx-auto py-8 max-w-4xl flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">{t('public.loading', 'Checking project configuration...')}</span>
        </div>
      </div>
    );
  }

  // If form doesn't have integrity (missing required elements), show the design required component
  if (!hasFormIntegrity) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <FormDesignRequired
          hasStoryQuestion={hasStoryQuestion}
          hasSliderQuestions={hasSliderQuestions}
          hasTriangleQuestions={hasTriangleQuestions}
          hasParticipantQuestions={hasParticipantQuestions}
        />
      </div>
    );
  }
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8 text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-mono font-medium bg-primary/10 text-primary border border-primary/20 mb-2">
          AI Interviewer
        </div>
        <h1 className="text-3xl sm:text-4xl font-heading font-semibold tracking-[-0.03em] text-foreground [text-wrap:balance]">
          {t('admin.interviewer.preview_title', 'Interviewer Preview')}
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl mx-auto [text-wrap:pretty]">
          {t('admin.interviewer.preview_description', 'Preview and test your interviewer collection agent in real time.')}
        </p>
      </div>
      <Card className="flex flex-col force-light text-left bg-card border border-border/80 shadow-xs rounded-lg overflow-hidden">
        <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl font-heading font-semibold tracking-tight text-foreground flex items-center">
              <MessageSquare className="mr-2 h-5 w-5 inline text-primary flex-shrink-0" />
              <span className="truncate sm:whitespace-normal">{t('public.title', 'Interviewer')}</span>
              <InfoTooltip contentKey="interviewer-page-info" size={16} />
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {t('admin.interviewer.card_description', 'Interactive conversational AI narrative collection')}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {langConfig.enabledLanguages.length > 1 && (
              <LanguageSelector 
                activeLang={activeLang}
                enabledLanguages={langConfig.enabledLanguages}
                onLanguageChange={handleLanguageChange}
              />
            )}
            
            <div className="flex gap-1.5 sm:gap-2">
              {messages.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportConversation}
                    title={t('public.button.export', 'Export')}
                    aria-label={t('public.button.export', 'Export')}
                    className="h-8 px-2 sm:px-3 active:scale-[0.98] transition-transform shadow-xs text-xs"
                  >
                    <Download className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t('public.button.export', 'Export')}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearInterview}
                    title={t('public.button.reset', 'Reset')}
                    aria-label={t('public.button.reset', 'Reset')}
                    className="h-8 px-2 sm:px-3 active:scale-[0.98] transition-transform shadow-xs text-xs"
                  >
                    <RotateCcw className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t('public.button.reset', 'Reset')}</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col p-0 border-t border-border/60">
          {/* Loading state */}
          {(contextLoading || storyLoading) && <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t('public.loading', 'Preparing interview...')}</span>
            </div>
          </div>}

          {/* No story question state */}
          {!contextLoading && !storyLoading && !savedQuestion && <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">{t('public.error.config_admin', 'No story question found for this project.')}</p>
              <p className="text-sm text-muted-foreground">{t('admin.interviewer.create_prompt', 'Please create a story question in the Design phase first.')}</p>
            </div>
          </div>}

          {/* Ready to start interview */}
          {isReady && !isInterviewStarted && !saveError && <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-4 max-w-md w-full px-4">
              <h3 className="text-xl font-bold tracking-tight text-foreground">{t('public.ready.title', 'Ready to Start Interview')}</h3>
              <div className="bg-card p-5 rounded-xl border border-border/80 shadow-xs text-left">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('public.ready.prompt', 'Story Question:')}</p>
                <p className="font-medium text-base text-foreground leading-relaxed">{localizeStoryQuestion(savedQuestion, activeLang)}</p>
              </div>
              <Button onClick={handleStartInterview} disabled={isLoading} className="w-full sm:w-auto px-6 active:scale-[0.98] shadow-xs">
                {isLoading ? <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('public.button.starting', 'Starting...')}
                </> : t('public.button.start', 'Start Interview')}
              </Button>
            </div>
          </div>}

          {/* Chat Messages Area */}
          {isInterviewStarted && <>
            <InterviewerMessageList
              messages={messages}
              isLoading={isLoading}
              isThinking={isThinking}
              currentPhase={currentPhase}
              storyHasBeenSaved={storyHasBeenSaved}
              saveError={saveError}
              isSaving={isSaving}
              error={error}
              messagesEndRef={messagesEndRef}
              onSliderSubmit={(qId, val) => { void handleSliderSubmit(qId, val); }}
              onSliderSkip={(qId) => { void handleSliderSkip(qId); }}
              onTriangleSubmit={(qId, x, y) => { void handleTriangleSubmit(qId, x, y); }}
              onTriangleSkip={(qId) => { void handleTriangleSkip(qId); }}
              onParticipantSubmit={(qId, cId) => { void handleParticipantSubmit(qId, cId); }}
              onParticipantSkip={(qId) => { void handleParticipantSkip(qId); }}
              onEmotionSelect={(f, of) => { void handleEmotionSelect(f, of); }}
              onRetrySave={() => void retrySave()}
              onClearInterview={clearInterview}
              scrollAreaClassName="h-[600px] bg-background"
            />

            <InterviewerInputBar
              inputValue={inputValue}
              onInputChange={setInputValue}
              onSendMessage={() => { void handleSendMessage(); }}
              disabled={isLoading || isThinking}
            />
          </>}

          {/* Error state */}
          {error && <div className="p-4 border-t bg-destructive/5 border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>}
        </CardContent>
      </Card>
    </div>
  );
};
export default Interviewer;