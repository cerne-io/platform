import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Bot } from "lucide-react";
import InteractiveMessage from "@/components/chat/InteractiveMessage";
import { ChatMessage } from "@/types/chatTypes";

export interface InterviewerMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isThinking: boolean;
  currentPhase: string;
  storyHasBeenSaved: boolean;
  saveError: string | null;
  isSaving: boolean;
  error: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onSliderSubmit: (qId: number, val: number) => void;
  onSliderSkip: (qId: number) => void;
  onTriangleSubmit: (qId: number, x: number, y: number) => void;
  onTriangleSkip: (qId: number) => void;
  onParticipantSubmit: (qId: string, cId: string) => void;
  onParticipantSkip: (qId: string) => void;
  onEmotionSelect: (feeling: string, otherFeeling?: string) => void;
  onRetrySave: () => void;
  onClearInterview: () => void;
  scrollAreaClassName?: string;
}

export const InterviewerMessageList: React.FC<InterviewerMessageListProps> = ({
  messages,
  isLoading,
  isThinking,
  currentPhase,
  storyHasBeenSaved,
  saveError,
  isSaving,
  messagesEndRef,
  onSliderSubmit,
  onSliderSkip,
  onTriangleSubmit,
  onTriangleSkip,
  onParticipantSubmit,
  onParticipantSkip,
  onEmotionSelect,
  onRetrySave,
  onClearInterview,
  scrollAreaClassName = "flex-1 bg-background",
}) => {
  const { t } = useTranslation('translation', { keyPrefix: 'public' });

  return (
    <ScrollArea className={scrollAreaClassName}>
      <div className="p-4 md:p-6 space-y-4">
        {messages.map((message, index) => (
          <InteractiveMessage
            key={index}
            message={message}
            onSliderSubmit={onSliderSubmit}
            onSliderSkip={onSliderSkip}
            onTriangleSubmit={onTriangleSubmit}
            onTriangleSkip={onTriangleSkip}
            onParticipantSubmit={onParticipantSubmit}
            onParticipantSkip={onParticipantSkip}
            onEmotionSelect={onEmotionSelect}
            disabled={isLoading || isThinking || index !== messages.length - 1 || currentPhase === 'complete'}
          />
        ))}

        {(isLoading || isThinking) && (
          <div className="flex items-center md:gap-3 animate-in fade-in-0 duration-200">
            <div className="hidden md:flex h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20 items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-card border border-border/80 text-foreground px-4 py-3 rounded-lg rounded-bl-xs shadow-xs">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">{t('status.thinking', 'Thinking...')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Success indicator when story is saved */}
        {currentPhase === 'complete' && storyHasBeenSaved && (
          <div className="flex justify-center animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-5 rounded-md w-full md:w-auto shadow-xs">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">{t('status.completed', 'Interview completed and saved')}</p>
                  <p className="text-xs opacity-90">{t('status.thank_you', 'Thank you for sharing your experience.')}</p>
                </div>
              </div>
              <Button
                onClick={onClearInterview}
                variant="outline"
                size="sm"
                className="w-full text-xs active:scale-[0.98] transition-transform duration-150"
              >
                {t('button.share_another', 'Share another experience')}
              </Button>
            </div>
          </div>
        )}

        {/* Save pending / Connection error indicator */}
        {currentPhase === 'complete' && !storyHasBeenSaved && saveError && (
          <div className="flex justify-center">
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 md:px-6 py-4 rounded-lg w-full md:w-auto text-center">
              <div className="flex items-center gap-3 mb-3 text-left">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">{t('status.save_error_title', 'Connection Issue - Save Pending')}</p>
                  <p className="text-sm opacity-90">{saveError}</p>
                </div>
              </div>
              <Button
                onClick={onRetrySave}
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('button.saving', 'Saving...')}
                  </>
                ) : (
                  t('button.retry_save', 'Retry Save')
                )}
              </Button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};

export default InterviewerMessageList;
