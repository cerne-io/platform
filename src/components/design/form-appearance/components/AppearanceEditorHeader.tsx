
import React from "react";
import { CardTitle } from "@/components/ui/card";
import { InfoTooltip } from "@/components/ui/info-tooltip";

const AppearanceEditorHeader: React.FC = () => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CardTitle className="text-lg dark:text-gray-100">Form Appearance</CardTitle>
        <InfoTooltip contentKey="form-appearance" size={16} />
      </div>
    </div>
  );
};

export default AppearanceEditorHeader;
