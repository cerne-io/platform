
import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { CerneBuilderQuestion } from "@/components/design/form-builder/types";

interface EmotionalResponseProps {
  feeling: string;
  otherFeeling: string;
  onFeelingChange: (value: string) => void;
  onOtherFeelingChange: (value: string) => void;
  isPublic?: boolean;
  customQuestion?: CerneBuilderQuestion | null;
  activeLang?: string;
}

const EmotionalResponse: React.FC<EmotionalResponseProps> = ({
  feeling,
  otherFeeling,
  onFeelingChange,
  onOtherFeelingChange,
  isPublic = false,
  customQuestion,
  activeLang
}) => {
  const { t } = useTranslation('translation', { keyPrefix: 'public' });

  // If a custom builder question is provided, use its prompt and options; otherwise use the hardcoded fallback
  const questionPrompt = customQuestion
    ? ((activeLang && customQuestion.translations?.[activeLang]?.label) || customQuestion.label)
    : t('form.emotional_response.question');

  const options = customQuestion && customQuestion.options && customQuestion.options.length > 0
    ? customQuestion.options.map((opt) => ({
        id: opt.id,
        label: (activeLang && opt.translations?.[activeLang]) || opt.label,
      }))
    : [
        { id: "enthusiastic", label: t('form.emotional_response.options.enthusiastic') },
        { id: "confused", label: t('form.emotional_response.options.confused') },
        { id: "frustrated", label: t('form.emotional_response.options.frustrated') },
        { id: "engaged", label: t('form.emotional_response.options.engaged') },
        { id: "other", label: t('form.emotional_response.options.other') },
      ];

  const isOther = feeling === "other" || (
    customQuestion?.options?.some(
      (o) => (o.id === feeling || o.label === feeling) && (o.id.toLowerCase() === "other" || o.label.toLowerCase() === "other")
    )
  );

  return (
    <div className="mt-8 mb-4">
      <Label className={`flex items-center gap-1 mb-4 text-xs font-semibold uppercase tracking-wider ${isPublic ? 'text-gray-500 dark:text-gray-400' : 'text-muted-foreground'}`}>
        {questionPrompt}
      </Label>
      <RadioGroup value={feeling} onValueChange={onFeelingChange} className="grid grid-cols-1 gap-4">
        {options.map((opt) => (
          <div key={opt.id} className="flex items-center space-x-3">
            <RadioGroupItem value={opt.id} id={`feeling-${opt.id}`} />
            <Label htmlFor={`feeling-${opt.id}`} className="cursor-pointer">
              {opt.label}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {isOther && (
        <div className="mt-4 ml-7">
          <Input
            value={otherFeeling}
            onChange={(e) => onOtherFeelingChange(e.target.value)}
            placeholder={t('form.emotional_response.other_placeholder')}
            className={isPublic ? 'border-blue-200 focus:border-blue-400' : ''}
          />
        </div>
      )}
    </div>
  );
};

export default EmotionalResponse;
