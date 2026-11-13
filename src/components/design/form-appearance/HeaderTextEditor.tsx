import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

interface HeaderTextEditorProps {
  headerText: string | Record<string, string>;
  subheaderText: string | Record<string, string>;
  onHeaderChange: (text: string, lang?: string) => void;
  onSubheaderChange: (text: string, lang?: string) => void;
  disabled?: boolean;
  activeLang?: string;
}

const HeaderTextEditor: React.FC<HeaderTextEditorProps> = ({
  headerText,
  subheaderText,
  onHeaderChange,
  onSubheaderChange,
  disabled = false,
  activeLang = "en"
}) => {
  const { t } = useTranslation();

  const getLocalizedValue = (val: string | Record<string, string>, fallbackKey: string) => {
    // If it's an object, try to get the active language or show the localized default
    if (typeof val === 'object' && val !== null) {
      if (val[activeLang] && val[activeLang].trim().length > 0) {
        return val[activeLang];
      }
      return t(fallbackKey, { lng: activeLang });
    }
    
    // If it's a string, it's treated as the english/default value.
    // If on English tab, return it (or the English default if empty)
    if (activeLang === 'en') {
      return (typeof val === 'string' && val.trim().length > 0) ? val : t(fallbackKey, { lng: 'en' });
    }
    
    // If on a non-English tab and we only have a string (English value),
    // show the localized default for this tab's language.
    return t(fallbackKey, { lng: activeLang });
  };

  const headerPlaceholder = t('public.form.card.header_fallback', { lng: activeLang });
  const subheaderPlaceholder = t('public.form.card.subheader_fallback', { lng: activeLang });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center space-x-2 min-h-[24px]">
          <Label htmlFor="header-text" className="text-sm font-medium dark:text-gray-200">Header Text</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-[220px] text-xs">
                  The main headline that appears at the top of your public form
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Input
          id="header-text"
          value={getLocalizedValue(headerText, 'public.form.card.header_fallback')}
          onChange={(e) => !disabled && onHeaderChange(e.target.value, activeLang)}
          placeholder={headerPlaceholder}
          className="text-sm dark:bg-[#161B22] dark:border-white/10 dark:text-white"
          disabled={disabled}
        />

        <p className="text-xs text-gray-500 dark:text-gray-400">
          The main headline for your form
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2 min-h-[24px]">
          <Label htmlFor="subheader-text" className="text-sm font-medium dark:text-gray-200">Subheader Text</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-[220px] text-xs">
                  A brief description or instruction that appears below the header
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Textarea
          id="subheader-text"
          value={getLocalizedValue(subheaderText, 'public.form.card.subheader_fallback')}
          onChange={(e) => !disabled && onSubheaderChange(e.target.value, activeLang)}
          placeholder={subheaderPlaceholder}
          className="text-sm dark:bg-[#161B22] dark:border-white/10 dark:text-white resize-none min-h-[96px]"
          disabled={disabled}
          rows={2}
        />

        <p className="text-xs text-gray-500 dark:text-gray-400">
          A brief description that appears below the header
        </p>
      </div>
    </div>
  );
};

export default HeaderTextEditor;
