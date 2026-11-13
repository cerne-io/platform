import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface InterviewerStartCardProps {
  storyQuestion: string;
  isLoading: boolean;
  isThinking: boolean;
  onStartInterview: () => void;
}

export const InterviewerStartCard: React.FC<InterviewerStartCardProps> = ({
  storyQuestion,
  isLoading,
  isThinking,
  onStartInterview,
}) => {
  const { t } = useTranslation('translation', { keyPrefix: 'public' });

  if (!storyQuestion) {
    return (
      <div className="flex items-center justify-center py-16 flex-1">
        <div className="text-center space-y-4 px-4">
          <p className="text-muted-foreground">{t('error.config', 'This interview is not configured yet.')}</p>
          <p className="text-sm text-muted-foreground">{t('error.contact', 'Please contact the project owner.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8 md:py-16 flex-1 px-4">
      <div className="text-center space-y-5 max-w-md w-full">
        <h2 className="text-xl font-bold text-foreground tracking-tight [text-wrap:balance]">
          {t('ready.title', 'Ready to Share Your Story')}
        </h2>
        <div className="bg-card p-5 rounded-xl border border-border/80 shadow-xs text-left">
          <span className="text-xs font-semibold text-muted-foreground block mb-2">
            {t('ready.prompt', "We'd like to hear about:")}
          </span>
          <p className="font-medium text-base text-foreground leading-relaxed [text-wrap:pretty]">
            {storyQuestion}
          </p>
        </div>
        <Button
          onClick={onStartInterview}
          disabled={isLoading || isThinking}
          className="w-full md:w-auto px-6 py-2.5 active:scale-[0.98] transition-transform duration-150 shadow-xs"
        >
          {isLoading || isThinking ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('button.starting', 'Starting...')}
            </>
          ) : (
            t('button.start', 'Start Interview')
          )}
        </Button>
      </div>
    </div>
  );
};

export default InterviewerStartCard;
