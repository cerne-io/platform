import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';
import { Globe, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LanguageTabsProps {
  enabledLanguages: string[];
  activeLanguage: string;
  onLanguageChange: (langCode: string) => void;
  translations?: Record<string, unknown>;
  rightElement?: React.ReactNode;
  className?: string;
  /**
   * Rendering style:
   * - 'auto': Tabs if <= maxTabs, dropdown Select if > maxTabs (default)
   * - 'tabs': Always render horizontal tabs
   * - 'select': Always render dropdown Select
   */
  variant?: 'auto' | 'tabs' | 'select';
  /**
   * Threshold for 'auto' mode before switching to dropdown. Defaults to 3.
   */
  maxTabs?: number;
  /**
   * If true, uses short language codes (e.g. EN, PT-BR) in tabs to prevent overflow in narrow sidebars
   */
  compact?: boolean;
}

const checkIsTranslated = (content: unknown): boolean => {
  if (!content) return false;
  if (typeof content === 'boolean') return content;
  if (typeof content === 'string') return content.trim().length > 0;
  if (typeof content === 'object') return Object.keys(content).length > 0;
  return false;
};

const LanguageTabs: React.FC<LanguageTabsProps> = ({
  enabledLanguages,
  activeLanguage,
  onLanguageChange,
  translations = {},
  rightElement,
  className,
  variant = 'auto',
  maxTabs = 3,
  compact = false,
}) => {
  if (!enabledLanguages || enabledLanguages.length <= 1) return null;

  const useDropdown = variant === 'select' || (variant !== 'tabs' && enabledLanguages.length > maxTabs);

  if (useDropdown) {
    const activeLang = SUPPORTED_LANGUAGES.find(l => l.code === activeLanguage);
    const isCurrentTranslated = checkIsTranslated(translations[activeLanguage]);

    return (
      <div className={cn("flex items-center justify-between gap-2 mb-4 min-w-0", className)}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Globe className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          <Select value={activeLanguage} onValueChange={onLanguageChange}>
            <SelectTrigger
              aria-label="Select language"
              className="h-8 text-xs bg-gray-100/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-all flex-1 min-w-0"
            >
              <div className="flex items-center gap-1.5 min-w-0 truncate mr-1">
                {activeLang?.flag && <span className="text-sm shrink-0">{activeLang.flag}</span>}
                <span className="truncate font-medium">{activeLang?.name || activeLanguage}</span>
                {isCurrentTranslated && (
                  <span
                    className="flex items-center justify-center w-3 h-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0 ml-0.5"
                    title="Translated"
                  >
                    <Check className="w-2 h-2" />
                  </span>
                )}
              </div>
            </SelectTrigger>
            <SelectContent>
              {enabledLanguages.map(langCode => {
                const lang = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
                const isTranslated = checkIsTranslated(translations[langCode]);

                return (
                  <SelectItem key={langCode} value={langCode} className="text-xs">
                    <div className="flex items-center justify-between w-full gap-3">
                      <span className="flex items-center gap-1.5">
                        {lang?.flag && <span>{lang.flag}</span>}
                        <span>{lang?.name || langCode}</span>
                      </span>
                      {isTranslated && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                          <Check className="w-2.5 h-2.5" />
                          <span>Translated</span>
                        </span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        {rightElement && (
          <div className="flex items-center shrink-0">
            {rightElement}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-between gap-2 mb-4 flex-wrap min-w-0", className)}>
      <div className="flex items-center gap-2 min-w-0 max-w-full">
        <div className="flex items-center text-[10px] uppercase tracking-wider font-bold text-muted-foreground shrink-0">
          <Globe className="w-3.5 h-3.5 text-muted-foreground/60" />
        </div>
        <Tabs value={activeLanguage} onValueChange={onLanguageChange} className="w-auto min-w-0 max-w-full">
          <TabsList className="h-8 bg-gray-100/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-1 max-w-full overflow-x-auto no-scrollbar">
            {enabledLanguages.map(langCode => {
              const lang = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
              const isTranslated = checkIsTranslated(translations[langCode]);
              const label = compact
                ? (lang?.code?.toUpperCase() || langCode.toUpperCase())
                : (lang?.name || langCode);

              return (
                <TabsTrigger
                  key={langCode}
                  value={langCode}
                  title={lang?.name || langCode}
                  className={cn(
                    "text-xs py-1 data-[state=active]:bg-white dark:data-[state=active]:bg-[#0d1117] transition-all shrink-0",
                    compact ? "px-2.5" : "px-3"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{label}</span>
                    {isTranslated && (
                      <div className="flex items-center justify-center w-3 h-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-2 h-2" />
                      </div>
                    )}
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
      {rightElement && (
        <div className="flex items-center shrink-0">
          {rightElement}
        </div>
      )}
    </div>
  );
};

export default React.memo(LanguageTabs);

