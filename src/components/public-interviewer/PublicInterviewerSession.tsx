import React, { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useInterviewer } from "@/hooks/useInterviewer";
import { buildProjectContext } from "@/utils/project-context/contextBuilder";
import {
  extractStoryQuestion,
  extractSliderQuestions,
  extractParticipantQuestions,
  extractTriangleQuestions
} from "@/services/publicForm/utils";
import { debugLog } from "@/utils/debugLogger";
import { filterQuestionsByType } from "@/utils/filterQuestionsByType";
import { QuestionType } from "@/services/formConfig/questionTypeService";
import PublicFooter from "@/components/layout/PublicFooter";
import { ProjectLanguages } from "@/services/formLanguageService";
import {
  localizeStoryQuestion,
  localizeSliderQuestion,
  localizeTriangleQuestion,
  localizeParticipantQuestion
} from "@/utils/formLocalization";
import InterviewerHeader from "./InterviewerHeader";
import InterviewerStartCard from "./InterviewerStartCard";
import InterviewerMessageList from "./InterviewerMessageList";
import InterviewerInputBar from "./InterviewerInputBar";

export interface PublicInterviewerSessionProps {
  projectId: string;
  formId?: string;
  effectiveLocale: string;
  defaultLocale: string;
  langConfig: ProjectLanguages;
  rawContextData: Record<string, unknown> | null;
  onLanguageChange: (lang: string) => void;
  isSwitchingLocale?: boolean;
}

/**
 * PublicInterviewerSession is mounted ONLY after form configuration and locale readiness
 * are verified for the current form and effective locale.
 * 
 * Changing languages does NOT unmount this session (preserving messages and interview progress),
 * but updates options and re-localizes pending questions dynamically.
 */
export const PublicInterviewerSession: React.FC<PublicInterviewerSessionProps> = ({
  projectId,
  formId,
  effectiveLocale,
  defaultLocale,
  langConfig,
  rawContextData,
  onLanguageChange,
  isSwitchingLocale = false,
}) => {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Localize content dynamically based on effectiveLocale and defaultLocale
  const {
    storyQuestion,
    sliderQuestions,
    triangleQuestions,
    participantQuestions,
    projectContext,
    formHeader,
    formSubheader
  } = useMemo(() => {
    if (!rawContextData) {
      return {
        storyQuestion: "",
        sliderQuestions: [],
        triangleQuestions: [],
        participantQuestions: [],
        projectContext: "",
        formHeader: "",
        formSubheader: ""
      };
    }

    const context = buildProjectContext({
      name: `Project ${projectId}`,
      id: projectId,
      description: "Public interview session",
      activityResponses: rawContextData
    });

    const storyQuestionData = rawContextData.storyQuestion;
    const parsedStoryQuestion = extractStoryQuestion(storyQuestionData);
    const localizedStory = parsedStoryQuestion
      ? localizeStoryQuestion(parsedStoryQuestion, effectiveLocale, undefined, defaultLocale)
      : "";

    const parsedSliders = (extractSliderQuestions(rawContextData.sliderQuestions) || [])
      .map(q => localizeSliderQuestion(q, effectiveLocale, defaultLocale));

    const parsedTriangles = (extractTriangleQuestions(rawContextData.triangleQuestions) || [])
      .map(q => localizeTriangleQuestion(q, effectiveLocale, defaultLocale));

    const questionTypeRaw = rawContextData.questionType as QuestionType | null | undefined;
    const filtered = filterQuestionsByType(parsedSliders, parsedTriangles, questionTypeRaw);

    const parsedParticipants = (extractParticipantQuestions(rawContextData.participantQuestions) || [])
      .map(q => localizeParticipantQuestion(q, effectiveLocale, defaultLocale));

    const localizedHeader = localizeStoryQuestion(
      rawContextData.headerText,
      effectiveLocale,
      'public.form.card.header_fallback',
      defaultLocale
    );

    const localizedSubheader = localizeStoryQuestion(
      rawContextData.subheaderText,
      effectiveLocale,
      'public.form.card.subheader_fallback',
      defaultLocale
    );

    return {
      storyQuestion: localizedStory,
      sliderQuestions: filtered.sliderQuestions,
      triangleQuestions: filtered.triangleQuestions,
      participantQuestions: parsedParticipants,
      projectContext: context,
      formHeader: localizedHeader,
      formSubheader: localizedSubheader
    };
  }, [rawContextData, effectiveLocale, defaultLocale, projectId]);

  // Set up interviewer hook bound to effectiveLocale
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
    storyQuestion,
    projectId: projectId || undefined,
    sliderQuestions,
    triangleQuestions,
    participantQuestions,
    isPublic: true,
    formId: formId || undefined,
    language: effectiveLocale
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
    debugLog("🚀 PUBLIC INTERVIEWER: Sending message");
    const success = await sendMessage(draft);
    if (success === false) {
      setInputValue(draft);
    }
  };

  const handleStartInterview = () => {
    if (storyQuestion) {
      debugLog("🚀 PUBLIC INTERVIEWER: Starting interview");
      void startInterview();
    }
  };

  return (
    <div className="h-screen h-dvh md:min-h-screen w-full flex flex-col items-center justify-between bg-background p-0 overflow-hidden md:overflow-visible">
      <div className="flex-1 min-h-0 flex items-stretch md:items-center justify-center w-full h-full md:h-auto p-0 md:py-6 overflow-hidden">
        <Card className="flex flex-col w-full md:w-[80%] lg:w-[65%] h-full md:h-[82vh] md:max-h-[880px] md:min-h-[620px] border-0 md:border border-border/80 shadow-none md:shadow-lg rounded-none md:rounded-2xl overflow-hidden bg-background">
          <InterviewerHeader
            formHeader={formHeader}
            formSubheader={formSubheader}
            effectiveLocale={effectiveLocale}
            enabledLanguages={langConfig.enabledLanguages}
            isSwitchingLocale={isSwitchingLocale}
            onLanguageChange={onLanguageChange}
            messagesCount={messages.length}
            onExport={exportConversation}
            onReset={clearInterview}
          />

          <CardContent className="flex flex-col flex-1 min-h-0 p-0 overflow-hidden relative">
            {!isInterviewStarted ? (
              <InterviewerStartCard
                storyQuestion={storyQuestion}
                isLoading={isLoading}
                isThinking={isThinking}
                onStartInterview={handleStartInterview}
              />
            ) : (
              <>
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
                />

                <InterviewerInputBar
                  inputValue={inputValue}
                  onInputChange={setInputValue}
                  onSendMessage={() => { void handleSendMessage(); }}
                  disabled={isLoading || isThinking}
                />
              </>
            )}

            {/* Error state */}
            {error && (
              <div className="p-4 border-t bg-destructive/5 border-destructive/20 flex-shrink-0">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <PublicFooter className={cn("bg-transparent", isInterviewStarted ? "hidden md:block" : "block")} />
    </div>
  );
};

export default PublicInterviewerSession;
