import React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export interface InterviewerInputBarProps {
  inputValue: string;
  onInputChange: (val: string) => void;
  onSendMessage: () => void;
  disabled: boolean;
}

export const InterviewerInputBar: React.FC<InterviewerInputBarProps> = ({
  inputValue,
  onInputChange,
  onSendMessage,
  disabled,
}) => {
  const { t } = useTranslation('translation', { keyPrefix: 'public' });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="border-t border-border bg-card/90 backdrop-blur-md p-3 md:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-4 flex-shrink-0">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex-1 relative">
          <Input
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('input.placeholder', 'Type your response here...')}
            className="text-xs md:text-sm bg-background border-border/80 focus-visible:ring-1 focus-visible:ring-primary rounded-lg h-10"
            disabled={disabled}
          />
        </div>
        <Button
          onClick={onSendMessage}
          size="sm"
          className="h-10 px-4 active:scale-[0.98] transition-transform duration-150 shadow-xs"
          disabled={!inputValue.trim() || disabled}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default InterviewerInputBar;
