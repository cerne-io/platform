
import React from "react";
import AppearancePreview from "../AppearancePreview";

import { FormAppearance } from "../types";

interface AppearancePreviewWrapperProps {
  appearance: FormAppearance;
  activeLang?: string;
  isMini?: boolean;
}

const AppearancePreviewWrapper: React.FC<AppearancePreviewWrapperProps> = ({ 
  appearance, 
  activeLang,
  isMini = false
}) => {
  return (
    <div>
      <AppearancePreview appearance={appearance} activeLang={activeLang} isMini={isMini} />
    </div>
  );
};

export default AppearancePreviewWrapper;
