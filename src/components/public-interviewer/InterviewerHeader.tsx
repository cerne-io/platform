import React from "react";
import { useTranslation } from "react-i18next";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Download, RotateCcw } from "lucide-react";
import LanguageSelector from "@/components/form/LanguageSelector";

export interface InterviewerHeaderProps {
  formHeader?: string;
  formSubheader?: string;
  effectiveLocale: string;
  enabledLanguages: string[];
  isSwitchingLocale?: boolean;
  onLanguageChange: (lang: string) => void;
  messagesCount: number;
  onExport: () => void;
  onReset: () => void;
}

export const InterviewerHeader: React.FC<InterviewerHeaderProps> = ({
  formHeader,
  formSubheader,
  effectiveLocale,
  enabledLanguages,
  isSwitchingLocale = false,
  onLanguageChange,
  messagesCount,
  onExport,
  onReset,
}) => {
  const { t } = useTranslation('translation', { keyPrefix: 'public' });

  return (
    <CardHeader className="bg-card/85 backdrop-blur-md border-b border-border py-3 md:py-4 px-4 md:px-6 flex-shrink-0 flex flex-row items-center justify-between space-y-0 gap-3">
      <CardTitle className="flex flex-col gap-0.5 text-foreground text-base sm:text-lg min-w-0 flex-1 [text-wrap:balance]">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
          <span className="font-semibold tracking-tight">{formHeader || t('title', 'Share Your Story')}</span>
        </div>
        {formSubheader && (
          <span className="text-xs font-normal text-muted-foreground ml-6 md:ml-7 leading-normal [text-wrap:pretty]">
            {formSubheader}
          </span>
        )}
      </CardTitle>

      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        {enabledLanguages.length > 1 && (
          <LanguageSelector 
            activeLang={effectiveLocale}
            enabledLanguages={enabledLanguages}
            onLanguageChange={onLanguageChange}
            disabled={isSwitchingLocale}
          />
        )}

        <div className="flex gap-1.5 sm:gap-2">
          {messagesCount > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                title={t('button.export', 'Export')}
                aria-label={t('button.export', 'Export')}
                className="h-8 px-2 sm:px-3 text-xs active:scale-[0.98] transition-transform duration-150"
              >
                <Download className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">{t('button.export', 'Export')}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                title={t('button.reset', 'Reset')}
                aria-label={t('button.reset', 'Reset')}
                className="h-8 px-2 sm:px-3 text-xs active:scale-[0.98] transition-transform duration-150"
              >
                <RotateCcw className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">{t('button.reset', 'Reset')}</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </CardHeader>
  );
};

export default InterviewerHeader;
