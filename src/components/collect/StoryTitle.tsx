
import React from "react";
import { useForm } from "@/contexts/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { useTranslation } from "react-i18next";

interface StoryTitleProps {
  isPublic?: boolean;
}

const StoryTitle: React.FC<StoryTitleProps> = ({ isPublic = false }) => {
  const { storyTitle, setStoryTitle } = useForm();
  const { t } = useTranslation('translation', { keyPrefix: 'public' });

  return (
    <div>
      <Label
        htmlFor="storyTitle"
        className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider ${isPublic ? 'text-gray-500 dark:text-gray-400' : 'text-muted-foreground'}`}
      >
        {t('form.story_title.label')}
      </Label>
      <Input
        id="storyTitle"
        value={storyTitle}
        onChange={(e) => setStoryTitle(e.target.value)}
        placeholder={t('form.story_title.placeholder')}
        className="mt-1 border !border-input bg-background px-3 py-2 text-sm"
      />
    </div>
  );
};

export default StoryTitle;
