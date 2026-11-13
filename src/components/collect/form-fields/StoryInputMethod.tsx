import React from "react";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { processQuestion } from "../story-question/questionUtils";
import { localizeStoryQuestion } from "@/utils/formLocalization";

interface StoryInputMethodProps {
  storyQuestion: string | Record<string, string> | null;
  storyText: string;
  onChange: (value: string) => void;
  isPublic?: boolean;
  language?: string;
}

const StoryInputMethod: React.FC<StoryInputMethodProps> = ({
  storyQuestion,
  storyText,
  onChange,
  isPublic = false,
  language
}) => {
  const { t, i18n } = useTranslation('translation', { keyPrefix: 'public' });

  const activeLang = language || i18n.language || 'en';
  const processed = processQuestion(storyQuestion || "");
  const questionText = typeof processed === 'string' ? processed : localizeStoryQuestion(processed, activeLang);
  const placeholderText = t('input.placeholder', "Tell us your story...");

  return (
    <div className="space-y-4">
      {isPublic ? (
        <blockquote className="border-l-4 border-blue-400 pl-4 py-1 text-gray-800 dark:text-gray-100 text-sm sm:text-base leading-relaxed bg-blue-50/50 dark:bg-blue-950/40 rounded-r-md">
          {questionText || t('form.your_story', "Your story")} *
        </blockquote>
      ) : (
        <div className="flex justify-between items-center">
          <Label htmlFor="storyText" className="flex items-start gap-1 text-sm sm:text-base font-medium leading-relaxed text-foreground">
            <span>
              {questionText || t('form.your_story', "Your story")} *
            </span>
          </Label>
        </div>
      )}

      <Textarea
        id="storyText"
        value={storyText}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholderText}
        className="min-h-[200px]"
      />
    </div>
  );
};

export default StoryInputMethod;
