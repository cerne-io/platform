import React, { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Check, SkipForward } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ChatSliderProps {
  questionId: number;
  question: string;
  leftLabel: string;
  rightLabel: string;
  theme?: string;
  onSubmit: (questionId: number, value: number) => void;
  onSkip: (questionId: number) => void;
  disabled?: boolean;
}

const ChatSlider: React.FC<ChatSliderProps> = ({
  questionId,
  question,
  leftLabel,
  rightLabel,
  theme,
  onSubmit,
  onSkip,
  disabled = false
}) => {
  const { t } = useTranslation('translation', { keyPrefix: 'public.button' });
  const [value, setValue] = useState<number>(50);
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleValueChange = (newValue: number[]) => {
    setValue(newValue[0]);
    setHasInteracted(true);
  };

  const handleSubmit = () => {
    onSubmit(questionId, value);
  };

  const handleSkip = () => {
    onSkip(questionId);
  };

  return (
    <div className="space-y-4 p-4 bg-card rounded-xl border border-border/80 shadow-xs">
      {theme && (
        <div className="text-xs font-semibold text-muted-foreground">
          {theme}
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground leading-snug [text-wrap:pretty]">{question}</p>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground items-center">
            <span className="font-medium text-foreground/80">{leftLabel}</span>
            <span className="font-semibold text-foreground tabular-nums text-xs px-2 py-0.5 rounded-md bg-muted/60 border border-border/40">{value}</span>
            <span className="font-medium text-foreground/80">{rightLabel}</span>
          </div>

          <Slider
            value={[value]}
            onValueChange={handleValueChange}
            max={100}
            step={1}
            disabled={disabled}
            className="py-2"
          />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkip}
            disabled={disabled}
            className="active:scale-[0.98] transition-transform duration-150"
          >
            <SkipForward className="h-3 w-3 mr-1" />
            {t('skip')}
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={disabled || !hasInteracted}
            className="active:scale-[0.98] transition-transform duration-150 shadow-xs"
          >
            <Check className="h-3 w-3 mr-1" />
            {t('submit_response')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatSlider;
