import React, { memo } from "react";
import { FormAppearance } from "./types";
import { PreviewSkeleton } from "./FormAppearanceSkeleton";
import { useTranslation } from "react-i18next";

interface AppearancePreviewProps {
  appearance: FormAppearance;
  isLoading?: boolean;
  activeLang?: string;
  isMini?: boolean;
}

// Using memo to prevent unnecessary re-renders
const AppearancePreview: React.FC<AppearancePreviewProps> = memo(({
  appearance,
  isLoading = false,
  activeLang = "en",
  isMini = false
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

  // Show the preview UI with loading indicators if data is loading
  if (isLoading) {
    return <PreviewSkeleton />;
  }

  return (
    <div className="w-full">
      {/* Outer wrapper — the brand background color, just like the real public page */}
      <div
        className={isMini ? "rounded-lg overflow-hidden border border-gray-200" : "rounded-xl overflow-hidden border border-gray-200"}
        style={{ backgroundColor: appearance.backgroundColor || '#EEF4FB' }}
      >
        {/* Inner white card, centred — mirrors the real FormCard */}
        <div className={isMini ? "mx-auto bg-white rounded-lg m-1.5 shadow-sm overflow-hidden" : "mx-auto bg-white rounded-xl m-3 shadow-sm overflow-hidden"}>
          {/* Header area */}
          <div className={isMini ? "flex flex-col items-center text-center px-3 pt-3 pb-2 gap-1" : "flex flex-col items-center text-center px-5 pt-5 pb-3 gap-2"}>
            <h2
              className={isMini ? "text-[10px] font-bold text-gray-900 leading-tight" : "text-lg font-bold text-gray-900 leading-tight"}
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {getLocalizedValue(appearance.headerText, 'public.form.card.header_fallback')}
            </h2>
            <p className={isMini ? "text-[8px] text-gray-500 leading-tight" : "text-xs text-gray-500 leading-relaxed"}>
              {getLocalizedValue(appearance.subheaderText, 'public.form.card.subheader_fallback')}
            </p>
            {!isMini && <div className="w-full border-t border-gray-100 mt-2" />}
          </div>

          {/* Form body skeleton */}
          <div className={isMini ? "px-3 pb-3 space-y-1" : "px-5 pb-5 space-y-3"}>
            {/* Callout-style prompt */}
            <div className={isMini ? "border-l-2 border-blue-400 pl-2 py-0.5 bg-blue-50/50 rounded-r-md" : "border-l-4 border-blue-400 pl-3 py-1 bg-blue-50/50 rounded-r-md"}>
              <div className={isMini ? "h-1 bg-blue-200/60 rounded w-full mb-0.5" : "h-2.5 bg-blue-200/60 rounded w-full mb-1"} />
              <div className={isMini ? "h-1 bg-blue-200/60 rounded w-4/5" : "h-2.5 bg-blue-200/60 rounded w-4/5"} />
            </div>

            {!isMini && (
              <>
                {/* Textarea skeleton */}
                <div className="h-16 bg-gray-100 rounded-md w-full border border-gray-200" />

                {/* Label + input */}
                <div>
                  <div className="h-2 bg-gray-200 rounded w-2/5 mb-1.5" />
                  <div className="h-7 bg-gray-100 rounded-md w-full border border-gray-200" />
                </div>
              </>
            )}

            {/* Submit button */}
            <div className={isMini ? "pt-0.5 flex justify-center" : "pt-1"}>
              <div className={isMini ? "h-4 bg-blue-100 rounded-md w-16" : "h-8 bg-blue-100 rounded-md w-24"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

AppearancePreview.displayName = "AppearancePreview";

export default AppearancePreview;
