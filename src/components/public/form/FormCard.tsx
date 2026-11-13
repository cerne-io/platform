
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FormAppearance } from "@/components/design/form-appearance/types";

import PublicFormContainer from "@/components/collect/public/PublicFormContainer";

import FormSkeleton from "@/components/public/form/FormSkeleton";
import { DEFAULT_LANGUAGES } from "@/services/formLanguageService";
import LanguageSelector from "@/components/form/LanguageSelector";
import { useSearchParams } from "react-router-dom";
import i18n from "@/i18n";
import { useFormDataQuery } from "@/hooks/queries/useFormDataQuery";
import { localizeStoryQuestion } from "@/utils/formLocalization";

interface FormCardProps {
  formId?: string;
  projectId: string | null;
  appearance: FormAppearance | null;
  isReady: boolean;
  useNewImplementation?: boolean; // Keep for backward compatibility but not used
}

import { useTranslation } from "react-i18next";
import { resolveEffectiveLocale } from "@/utils/localeResolution";

const FormCard: React.FC<FormCardProps> = ({
  formId,
  projectId,
  appearance,
  isReady
}) => {
  useTranslation('translation', { keyPrefix: 'public' });
  const [searchParams, setSearchParams] = useSearchParams();
  const [userSelectedLang, setUserSelectedLang] = React.useState<string | null>(null);

  // Use the unified form data hook to get languages
  // Pass formId so cache-miss fallback reads use get_public_form_config (scoped by form_id)
  const { data: formData } = useFormDataQuery(projectId, true, formId, { enabled: !!projectId });
  const langConfig = formData?.languages || DEFAULT_LANGUAGES;

  const effectiveLocale = resolveEffectiveLocale({
    userSelection: userSelectedLang,
    urlParam: searchParams.get('lang'),
    formLanguages: formData?.languages ? langConfig : null,
    appFallback: 'en'
  });

  // Synchronization of i18next language with effectiveLocale
  React.useEffect(() => {
    void i18n.loadLanguages([effectiveLocale]).then(() => {
      void i18n.changeLanguage(effectiveLocale);
    }).catch(err => {
      console.error("FormCard failed to load language bundle for", effectiveLocale, err);
    });
  }, [effectiveLocale]);

  // Handle language change
  const handleLanguageChange = (lang: string) => {
    setUserSelectedLang(lang);
    void i18n.loadLanguages([lang]).then(() => {
      void i18n.changeLanguage(lang);
    });
    
    // Update URL parameter
    const newParams = new URLSearchParams(searchParams);
    newParams.set('lang', lang);
    setSearchParams(newParams, { replace: true });
  };

  // Clean appearance to avoid blob URLs
  const cleanAppearance = React.useMemo(() => {
    if (!appearance) return null;

    // Create a clean copy of appearance with blob URLs removed
    const clean = { ...appearance };
    if (clean.logoUrl && clean.logoUrl.startsWith('blob:')) {
      clean.logoUrl = '';
    }
    return clean;
  }, [appearance]);

  // The form is truly ready when we have both isReady=true AND a projectId
  const formIsReady = isReady && !!projectId;

  // Use appearance background color on the page wrapper; card itself is always white
  const wrapperStyle = {
    backgroundColor: cleanAppearance?.backgroundColor || '#EEF4FB'
  };

  return (
    <div
      className="w-full min-h-screen -m-0 flex flex-col items-center justify-start md:justify-center py-0 md:py-8 px-0 md:px-4 relative"
      style={wrapperStyle}
    >
      {langConfig.enabledLanguages.length > 1 && (
        <div className="w-full max-w-2xl flex justify-end mb-4 px-4 md:px-0">
        </div>
      )}

      <Card
        className="shadow-none md:shadow-xs border-0 md:border md:border-border/80 overflow-hidden rounded-none md:rounded-lg h-auto min-h-[50vh] md:min-h-0 w-full max-w-2xl bg-card relative"
      >
        {langConfig.enabledLanguages.length > 1 && (
          <div className="absolute top-6 right-6 z-10 px-0">
            <LanguageSelector 
              activeLang={effectiveLocale}
              enabledLanguages={langConfig.enabledLanguages}
              onLanguageChange={handleLanguageChange}
            />
          </div>
        )}

        <CardHeader className="text-center relative pb-12 pt-24 px-8">
          <CardTitle className="font-heading text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-foreground [text-wrap:balance]">
            {localizeStoryQuestion(cleanAppearance?.headerText, effectiveLocale, 'public.form.card.header_fallback', langConfig.defaultLanguage)}
          </CardTitle>
          
          <CardDescription className="text-muted-foreground mt-2 text-sm font-normal leading-relaxed max-w-md mx-auto [text-wrap:pretty]">
            {localizeStoryQuestion(cleanAppearance?.subheaderText, effectiveLocale, 'public.form.card.subheader_fallback', langConfig.defaultLanguage)}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          {!formIsReady ? (
            <FormSkeleton />
          ) : (
            <PublicFormContainer
              formId={formId}
              projectId={projectId}
              formAppearance={cleanAppearance}
              activeLang={effectiveLocale}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FormCard;
