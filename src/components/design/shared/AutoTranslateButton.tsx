import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { translationService } from '@/services/ai/translationService';
import { toast } from '@/components/ui/use-toast';
import { debugError } from '@/utils/debugLogger';

interface AutoTranslateButtonProps<T> {
  content?: T;
  getContent?: () => T;
  targetLanguages: string[];
  sourceLanguage?: string;
  onTranslationComplete: (translations: Record<string, T>) => void;
  className?: string;
  disabled?: boolean;
}

const AutoTranslateButton = <T,>({
  content,
  getContent,
  targetLanguages,
  sourceLanguage = 'en',
  onTranslationComplete,
  className = "",
  disabled = false
}: AutoTranslateButtonProps<T>) => {
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslate = async () => {
    const finalContent = getContent ? getContent() : content;
    if (!finalContent) return;
    
    // Check if it's an empty array or empty object
    if (Array.isArray(finalContent) && finalContent.length === 0) return;
    if (typeof finalContent === 'object' && !Array.isArray(finalContent) && Object.keys(finalContent as Record<string, unknown>).length === 0) return;
    
    // Filter out source language
    const targets = targetLanguages.filter(l => l !== sourceLanguage);
    if (targets.length === 0) return;

    setIsTranslating(true);
    try {
      const result = await translationService.translateContent(
        finalContent,
        targets,
        sourceLanguage
      );
      onTranslationComplete(result);
      toast({
        title: "Translation complete",
        description: `Successfully translated to ${targets.length} languages.`
      });
    } catch (error) {
      debugError("[AutoTranslateButton] Translation error:", error);
      toast({
        title: "Translation failed",
        description: "AI was unable to translate the content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void handleTranslate();
      }}
      disabled={isTranslating || (!content && !getContent) || disabled || targetLanguages.length <= 1}
      className={`flex items-center gap-2 h-8 text-xs text-primary hover:text-primary/80 hover:bg-primary/10 px-2 group ${className}`}
    >
      {isTranslating ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Sparkles className="w-3.5 h-3.5" />
      )}
      {isTranslating ? "Translating..." : "Auto-translate"}
    </Button>
  );
};

export default AutoTranslateButton;
