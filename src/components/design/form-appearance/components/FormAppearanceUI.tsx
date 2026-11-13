import React, { useState } from "react";
import { FormAppearance } from "../types";
import BackgroundColorPicker from "../BackgroundColorPicker";
import HeaderTextEditor from "../HeaderTextEditor";
import FormActionButtons from "../FormActionButtons";
import FloatingPreview from "./FloatingPreview";
import { FormEditorSkeleton, PreviewSkeleton } from "../FormAppearanceSkeleton";

import LanguageTabs from "../../shared/LanguageTabs";
import { useProjectLanguages } from "@/hooks/queries/useProjectLanguages";

interface FormAppearanceUIProps {
  appearance: FormAppearance;
  isLoading: boolean;
  isSaving: boolean;
  projectId?: string;
  canSaveChanges?: boolean;
  onColorChange: (color: string) => void;
  onHeaderChange: (text: string, lang?: string) => void;
  onSubheaderChange: (text: string, lang?: string) => void;
  onSave: () => void;
  onReset: () => void;
}

const FormAppearanceUI: React.FC<FormAppearanceUIProps> = ({
  appearance,
  isLoading,
  isSaving,
  projectId,
  canSaveChanges = true,
  onColorChange,
  onHeaderChange,
  onSubheaderChange,
  onSave,
  onReset
}) => {
  const [activeLang, setActiveLang] = useState<string>("en");
  const { data: languages } = useProjectLanguages(projectId);
  const enabledLanguages = languages?.enabledLanguages || ["en"];
  const showLanguageTabs = enabledLanguages.length > 1;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormEditorSkeleton />
        <PreviewSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-0 -mx-6 -mb-6">
      <div className="px-10 pb-6 pt-2 bg-white dark:bg-transparent">
        <div className="max-w-6xl mx-auto space-y-4">

          {/* Header Row: Language Context Zone & Status (Above Grid) */}
          {(showLanguageTabs || !canSaveChanges) && (
            <div className="flex items-center justify-between min-h-[40px] px-2">
              <div className="flex-1">
                {!canSaveChanges && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
                    Read-only Mode
                  </span>
                )}
              </div>
              {showLanguageTabs && (
                <div className="scale-90 origin-right">
                  <LanguageTabs
                    activeLanguage={activeLang}
                    enabledLanguages={enabledLanguages}
                    onLanguageChange={setActiveLang}
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start relative">
            {/* Left Column: Global Branding */}
            <div className="space-y-6">
              <BackgroundColorPicker
                value={appearance.backgroundColor}
                onChange={onColorChange}
                disabled={!canSaveChanges}
              />
            </div>

            {/* Right Column: Localized Content & Translation */}
            <div className="space-y-6">
              <HeaderTextEditor
                headerText={appearance.headerText}
                subheaderText={appearance.subheaderText}
                onHeaderChange={onHeaderChange}
                onSubheaderChange={onSubheaderChange}
                disabled={!canSaveChanges}
                activeLang={activeLang}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col items-center justify-center pt-4 space-y-4 max-w-4xl mx-auto">
            <FormActionButtons
              onSave={onSave}
              onReset={onReset}
              isSaving={isSaving}
              isLoading={isLoading}
              disabled={!canSaveChanges}
            />
          </div>
        </div>
      </div>

      {/* Floating Picture-in-Picture Preview */}
      <FloatingPreview
        appearance={appearance}
        activeLang={activeLang}
      />
    </div>
  );
};

export default FormAppearanceUI;
