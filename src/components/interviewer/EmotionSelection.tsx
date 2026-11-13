import React, { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface EmotionSelectionProps {
  onSelect: (feeling: string, otherFeeling?: string) => void;
  disabled?: boolean;
}

const EmotionSelection: React.FC<EmotionSelectionProps> = ({ onSelect, disabled }) => {
  const { t } = useTranslation('translation', { keyPrefix: 'public.form.emotional_response' });
  const { t: tPublic } = useTranslation('translation', { keyPrefix: 'public.button' });
  const [feeling, setFeeling] = useState('');
  const [otherFeeling, setOtherFeeling] = useState('');

  const handleSelect = (value: string) => {
    if (value === 'other') {
      setFeeling(value);
      // Wait for user to type custom feeling
    } else {
      setFeeling(value);
      // Immediately submit
      onSelect(value);
    }
  };

  const handleOtherSubmit = () => {
    if (otherFeeling.trim()) {
      onSelect('other', otherFeeling);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && otherFeeling.trim()) {
      e.preventDefault();
      handleOtherSubmit();
    }
  };

  return (
    <div className="w-full bg-card rounded-xl border border-border/80 shadow-xs p-4 space-y-4">
      <RadioGroup
        value={feeling}
        onValueChange={handleSelect}
        disabled={disabled}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
      >
        {[
          { id: 'enthusiastic', label: t('options.enthusiastic') },
          { id: 'engaged', label: t('options.engaged') },
          { id: 'confused', label: t('options.confused') },
          { id: 'frustrated', label: t('options.frustrated') },
        ].map((item) => {
          const isSelected = feeling === item.id;
          return (
            <Label
              key={item.id}
              htmlFor={item.id}
              className={`flex items-center space-x-2.5 p-3 rounded-lg border transition-all duration-150 cursor-pointer select-none font-normal ${
                isSelected
                  ? 'border-primary/60 bg-primary/[0.04] ring-1 ring-primary/20 shadow-xs'
                  : 'border-border/60 hover:bg-muted/40 hover:border-border'
              }`}
            >
              <RadioGroupItem value={item.id} id={item.id} className="cursor-pointer" />
              <span className="cursor-pointer flex-1 text-xs font-medium text-foreground/90">
                {item.label}
              </span>
            </Label>
          );
        })}

        <Label
          htmlFor="other"
          className={`sm:col-span-2 flex items-center space-x-2.5 p-3 rounded-lg border transition-all duration-150 cursor-pointer select-none font-normal ${
            feeling === 'other'
              ? 'border-primary/60 bg-primary/[0.04] ring-1 ring-primary/20 shadow-xs'
              : 'border-border/60 hover:bg-muted/40 hover:border-border'
          }`}
        >
          <RadioGroupItem value="other" id="other" className="cursor-pointer" />
          <span className="cursor-pointer flex-1 text-xs font-medium text-foreground/90">
            {t('options.other')}
          </span>
        </Label>
      </RadioGroup>

      {feeling === 'other' && (
        <div className="space-y-3 pt-1 animate-in fade-in-0 duration-200">
          <Input
            value={otherFeeling}
            onChange={(e) => setOtherFeeling(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('other_placeholder')}
            disabled={disabled}
            className="text-xs h-9 bg-background border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
          />
          <Button
            onClick={handleOtherSubmit}
            disabled={disabled || !otherFeeling.trim()}
            size="sm"
            className="w-full active:scale-[0.98] transition-transform duration-150 shadow-xs"
          >
            {tPublic('submit_response')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmotionSelection;
