import React, { useState, useRef } from 'react';
import { CerneBuilderQuestion } from './types';
import { generateUUID } from '@/utils/uuid';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { X, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { ProjectLanguages } from '@/constants/languages';
import LanguageTabs from '../shared/LanguageTabs';
import AutoTranslateButton from '../shared/AutoTranslateButton';
import { cleanDisplayLabel } from './SortableQuestionCard';
import { QuestionImprover } from '../improver/QuestionImprover';
import { PhasePrerequisitesWarning } from '../shared/PhasePrerequisitesWarning';
import { validateDesignPhasePrerequisites, PhaseValidationResult } from '@/services/validation/phaseValidationService';
import { prepareProjectContext } from '@/utils/project-context/prepareProjectContext';
import { aiAssistantService } from '@/services/aiAssistantService';
import { processGeneratedQuestion } from '../improver/questionUtils';
import { useProject } from '@/contexts/ProjectContext';
import { useInfluencingFactors } from '@/services/factors/useInfluencingFactors';
import { generateWithAI } from '@/hooks/slider-questions/sliderQuestionAIGenerator';
import { generateTriangleQuestionsWithAI } from '@/hooks/triangle-questions/modules/aiGenerator';
import { generateParticipantQuestionsWithAI } from '@/services/ai/participantQuestionGenerator';
import { Badge } from '@/components/ui/badge';

const AI_BUTTON_CLASS =
  'h-7 px-2.5 text-xs gap-1.5 bg-white dark:bg-[#9D7CFF]/10 border-[#5D3FD3] dark:border-[#9D7CFF]/50 text-[#5D3FD3] dark:text-[#9D7CFF] hover:bg-[#5D3FD3]/5 hover:text-[#5D3FD3] dark:hover:bg-[#9D7CFF]/20 dark:hover:text-[#9D7CFF] dark:shadow-[0_0_15px_rgba(157,124,255,0.2)] transition-all';

interface InspectorPanelProps {
  question: CerneBuilderQuestion;
  languages: ProjectLanguages;
  onUpdate: (updated: CerneBuilderQuestion, extraQuestions?: CerneBuilderQuestion[]) => void;
  onClose: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  question,
  languages,
  onUpdate,
  onClose,
}) => {
  const defaultLang = languages.defaultLanguage || 'en';
  const enabledLangs = languages.enabledLanguages || [defaultLang];
  const [selectedLang, setSelectedLang] = useState<string>(defaultLang);
  const isDefaultLang = selectedLang === defaultLang;

  const { activeProject } = useProject();
  const { getInfluencingFactors } = useInfluencingFactors(activeProject?.id || '');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<PhaseValidationResult | null>(null);
  const [suggestedItems, setSuggestedItems] = useState<CerneBuilderQuestion[]>([]);

  const supportsAIGen =
    question.type === 'story-question' ||
    question.type === 'slider' ||
    question.type === 'triangle' ||
    question.type === 'participant-questions';

  const currentTranslation = question.translations?.[selectedLang] || {};
  const latestQuestionRef = useRef(question);
  latestQuestionRef.current = question;

  // Updates either the base property or the translation entry depending on selected language
  const updateField = (field: string, value: string | boolean) => {
    const q = latestQuestionRef.current;
    if (isDefaultLang) {
      if (field === 'leftLabel' || field === 'rightLabel') {
        onUpdate({
          ...q,
          sliderConfig: {
            ...q.sliderConfig!,
            [field]: value as string,
          },
        });
      } else if (
        field === 'topLabel' ||
        field === 'bottomLeftLabel' ||
        field === 'bottomRightLabel'
      ) {
        onUpdate({
          ...q,
          triangleConfig: {
            ...q.triangleConfig!,
            [field]: value as string,
          },
        });
      } else {
        onUpdate({
          ...q,
          [field]: value,
        });
      }
    } else {
      // Non-default language: write into question.translations[selectedLang]
      const existingTrans = q.translations || {};
      const langTrans = existingTrans[selectedLang] || {};
      onUpdate({
        ...q,
        translations: {
          ...existingTrans,
          [selectedLang]: {
            ...langTrans,
            [field]: value as string,
          },
        },
      });
    }
  };

  // Choice Options for multiple-choice
  const updateOptionLabel = (optionId: string, label: string) => {
    const updatedOptions = (question.options || []).map((opt) => {
      if (opt.id !== optionId) return opt;
      if (isDefaultLang) {
        return { ...opt, label };
      } else {
        const trans = opt.translations || {};
        return {
          ...opt,
          translations: {
            ...trans,
            [selectedLang]: label,
          },
        };
      }
    });
    onUpdate({ ...question, options: updatedOptions });
  };

  const addOption = () => {
    const newOptions = [
      ...(question.options || []),
      { id: generateUUID(), label: `Choice ${(question.options?.length || 0) + 1}` },
    ];
    onUpdate({ ...question, options: newOptions });
  };

  const deleteOption = (optionId: string) => {
    const newOptions = (question.options || []).filter((opt) => opt.id !== optionId);
    onUpdate({ ...question, options: newOptions });
  };

  // Get effective values for current language
  const effectiveLabel = isDefaultLang ? cleanDisplayLabel(question.label, defaultLang) : (currentTranslation.label ?? '');
  const effectivePlaceholder = isDefaultLang
    ? (question.placeholder ?? '')
    : (currentTranslation.placeholder ?? '');
  const effectiveTheme = isDefaultLang
    ? (question.theme ?? '')
    : (currentTranslation.theme ?? '');

  const effectiveLeftLabel = isDefaultLang
    ? (question.sliderConfig?.leftLabel ?? '')
    : (currentTranslation.leftLabel ?? '');
  const effectiveRightLabel = isDefaultLang
    ? (question.sliderConfig?.rightLabel ?? '')
    : (currentTranslation.rightLabel ?? '');

  const effectiveTopLabel = isDefaultLang
    ? (question.triangleConfig?.topLabel ?? '')
    : (currentTranslation.topLabel ?? '');
  const effectiveBottomLeftLabel = isDefaultLang
    ? (question.triangleConfig?.bottomLeftLabel ?? '')
    : (currentTranslation.bottomLeftLabel ?? '');
  const effectiveBottomRightLabel = isDefaultLang
    ? (question.triangleConfig?.bottomRightLabel ?? '')
    : (currentTranslation.bottomRightLabel ?? '');

  // Language status map for checkmarks in LanguageTabs
  const languageStatusMap: Record<string, boolean> = {
    [defaultLang]: Boolean(question.label?.trim()),
  };
  enabledLangs.forEach((lang) => {
    if (lang !== defaultLang) {
      const trans = question.translations?.[lang];
      languageStatusMap[lang] = Boolean(
        trans && (trans.label?.trim() || trans.theme?.trim() || trans.leftLabel?.trim())
      );
    }
  });

  const getTranslatableContent = () => {
    switch (question.type) {
      case 'story-question':
        return {
          label: question.label,
          placeholder: question.placeholder || '',
        };
      case 'slider':
        return {
          label: question.label,
          theme: question.theme || '',
          leftLabel: question.sliderConfig?.leftLabel || '',
          rightLabel: question.sliderConfig?.rightLabel || '',
        };
      case 'triangle':
        return {
          label: question.label,
          theme: question.theme || '',
          topLabel: question.triangleConfig?.topLabel || '',
          bottomLeftLabel: question.triangleConfig?.bottomLeftLabel || '',
          bottomRightLabel: question.triangleConfig?.bottomRightLabel || '',
        };
      case 'participant-questions':
      case 'multiple-choice':
      case 'checkboxes':
        return {
          label: question.label,
          options: (question.options || []).map((o) => o.label),
        };
      default:
        return { label: question.label };
    }
  };

  const handleAutoTranslationComplete = (
    newTranslationsMap: Record<string, Record<string, unknown>>
  ) => {
    const updatedTranslations = { ...(question.translations || {}) };
    let updatedOptions = question.options ? [...question.options] : undefined;

    Object.entries(newTranslationsMap).forEach(([langCode, trans]) => {
      if (!trans || typeof trans !== 'object') return;
      const t = trans as Record<string, unknown>;

      updatedTranslations[langCode] = {
        ...(updatedTranslations[langCode] || {}),
        ...(typeof t.label === 'string' ? { label: t.label } : {}),
        ...(typeof t.placeholder === 'string' ? { placeholder: t.placeholder } : {}),
        ...(typeof t.theme === 'string' ? { theme: t.theme } : {}),
        ...(typeof t.leftLabel === 'string' ? { leftLabel: t.leftLabel } : {}),
        ...(typeof t.rightLabel === 'string' ? { rightLabel: t.rightLabel } : {}),
        ...(typeof t.topLabel === 'string' ? { topLabel: t.topLabel } : {}),
        ...(typeof t.bottomLeftLabel === 'string' ? { bottomLeftLabel: t.bottomLeftLabel } : {}),
        ...(typeof t.bottomRightLabel === 'string' ? { bottomRightLabel: t.bottomRightLabel } : {}),
      };

      if (Array.isArray(t.options) && updatedOptions) {
        const optArray = t.options as unknown[];
        updatedOptions = updatedOptions.map((opt, optIdx) => {
          const translatedOptLabel = optArray[optIdx];
          if (typeof translatedOptLabel === 'string') {
            const optTrans = { ...(opt.translations || {}) };
            optTrans[langCode] = translatedOptLabel;
            return { ...opt, translations: optTrans };
          }
          return opt;
        });
      }
    });

    onUpdate({
      ...question,
      translations: updatedTranslations,
      ...(updatedOptions ? { options: updatedOptions } : {}),
    });
  };

  return (
    <aside className="w-96 border-l border-border bg-card/95 backdrop-blur-md flex flex-col shrink-0 h-full overflow-hidden shadow-xl z-20 animate-in slide-in-from-right duration-300 ease-smooth">
      {/* Header */}
      <div className="p-4 border-b border-border/80 flex items-center justify-between bg-muted/30">
        <div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Element Properties</h3>
          <p className="text-xs text-muted-foreground capitalize">
            {question.type.replace('-', ' ')}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground active:scale-95 transition-all duration-150 rounded-md"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-5 overflow-y-auto flex-1">
        {/* Language Tabs & Auto-translate */}
        {enabledLangs.length > 1 && (
          <div className="pb-2 border-b border-border/60">
            <LanguageTabs
              enabledLanguages={enabledLangs}
              activeLanguage={selectedLang}
              onLanguageChange={setSelectedLang}
              translations={languageStatusMap}
              compact
              rightElement={
                <AutoTranslateButton
                  getContent={getTranslatableContent}
                  targetLanguages={enabledLangs}
                  sourceLanguage={defaultLang}
                  onTranslationComplete={handleAutoTranslationComplete}
                  disabled={!question.label?.trim()}
                />
              }
              className="mb-0"
            />
          </div>
        )}

        {/* Question Prompt / Label */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="q-label" className="text-xs font-medium text-foreground/90">
              Prompt Title {!isDefaultLang && `(${selectedLang.toUpperCase()})`}
            </Label>
            {supportsAIGen && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setGenError(null);
                  setIsAIModalOpen(true);
                  if (activeProject?.id) {
                    void validateDesignPhasePrerequisites(activeProject.id).then(setValidationResult);
                  }
                }}
                className={AI_BUTTON_CLASS}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate with AI
              </Button>
            )}
          </div>
          <Textarea
            id="q-label"
            value={effectiveLabel}
            placeholder={!isDefaultLang ? `Translation for ${question.label}` : 'Enter question text...'}
            onChange={(e) => updateField('label', e.target.value)}
            className="text-xs min-h-[72px] resize-none rounded-md border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        {/* Story Question: Placeholder */}
        {question.type === 'story-question' && (
          <div className="space-y-1.5">
            <Label htmlFor="q-placeholder" className="text-xs font-medium text-foreground/90">
              Input Placeholder
            </Label>
            <Input
              id="q-placeholder"
              value={effectivePlaceholder}
              placeholder="Helper prompt inside the narrative box..."
              onChange={(e) => updateField('placeholder', e.target.value)}
              className="h-8 text-xs rounded-md border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
        )}

        {/* Slider & Triangle: Theme Category */}
        {(question.type === 'slider' || question.type === 'triangle') && (
          <div className="space-y-1.5">
            <Label htmlFor="q-theme" className="text-xs font-medium text-foreground/90">
              Dimension / Theme
            </Label>
            <Input
              id="q-theme"
              value={effectiveTheme}
              placeholder="e.g. Trust, Autonomy, Communication"
              onChange={(e) => updateField('theme', e.target.value)}
              className="h-8 text-xs rounded-md border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
        )}

        {/* Slider Labels */}
        {question.type === 'slider' && question.sliderConfig && (
          <>
            <Separator />
            <div className="space-y-3">
              <span className="text-xs font-semibold text-foreground/80 block">
                Slider Poles {!isDefaultLang && `(${selectedLang.toUpperCase()})`}
              </span>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Left Pole Label</Label>
                <Input
                  value={effectiveLeftLabel}
                  placeholder={!isDefaultLang ? question.sliderConfig.leftLabel : 'e.g. Completely disagree'}
                  onChange={(e) => updateField('leftLabel', e.target.value)}
                  className="h-8 text-xs rounded-md border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Right Pole Label</Label>
                <Input
                  value={effectiveRightLabel}
                  placeholder={!isDefaultLang ? question.sliderConfig.rightLabel : 'e.g. Completely agree'}
                  onChange={(e) => updateField('rightLabel', e.target.value)}
                  className="h-8 text-xs rounded-md border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
            </div>
          </>
        )}

        {/* Triangle Labels */}
        {question.type === 'triangle' && question.triangleConfig && (
          <>
            <Separator />
            <div className="space-y-3">
              <span className="text-xs font-semibold text-foreground/80 block">
                Triangle Corners {!isDefaultLang && `(${selectedLang.toUpperCase()})`}
              </span>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Top Apex</Label>
                <Input
                  value={effectiveTopLabel}
                  placeholder={!isDefaultLang ? question.triangleConfig.topLabel : 'Top corner label'}
                  onChange={(e) => updateField('topLabel', e.target.value)}
                  className="h-8 text-xs rounded-md border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Bottom Left Apex</Label>
                <Input
                  value={effectiveBottomLeftLabel}
                  placeholder={!isDefaultLang ? question.triangleConfig.bottomLeftLabel : 'Bottom left label'}
                  onChange={(e) => updateField('bottomLeftLabel', e.target.value)}
                  className="h-8 text-xs rounded-md border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Bottom Right Apex</Label>
                <Input
                  value={effectiveBottomRightLabel}
                  placeholder={!isDefaultLang ? question.triangleConfig.bottomRightLabel : 'Bottom right label'}
                  onChange={(e) => updateField('bottomRightLabel', e.target.value)}
                  className="h-8 text-xs rounded-md border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
            </div>
          </>
        )}

        {/* Participant Questions, Multiple Choice, Checkbox & Emotional Response Options */}
        {(question.type === 'participant-questions' || question.type === 'multiple-choice' || question.type === 'checkboxes' || question.type === 'emotional-response') && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground/80">
                  {question.type === 'emotional-response' ? 'Emotion Options' : 'Choice Options'}
                </span>
                {isDefaultLang && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-primary gap-1 px-2 active:scale-95 transition-transform duration-150 rounded-md"
                    onClick={addOption}
                  >
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {question.options?.map((opt, i) => {
                  const optLabel = isDefaultLang
                    ? opt.label
                    : (opt.translations?.[selectedLang] ?? '');

                  return (
                    <div key={opt.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4 shrink-0 text-center font-mono tabular-nums">
                        {i + 1}
                      </span>
                      <Input
                        value={optLabel}
                        placeholder={!isDefaultLang ? opt.label : `Choice ${i + 1}`}
                        onChange={(e) => updateOptionLabel(opt.id, e.target.value)}
                        className="h-8 text-xs flex-1 rounded-md border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
                      />
                      {isDefaultLang && (question.options?.length || 0) > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive active:scale-95 transition-all duration-150 shrink-0 rounded-md"
                          onClick={() => deleteOption(opt.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {isDefaultLang && question.type === 'participant-questions' && (
                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="prefer-not" className="text-xs text-foreground/90">Include &quot;Prefer not to say&quot;</Label>
                    <p className="text-xs text-muted-foreground/80">Appends standard opt-out choice</p>
                  </div>
                  <Switch
                    id="prefer-not"
                    checked={question.includePreferNotToSay ?? true}
                    onCheckedChange={(checked) => onUpdate({ ...question, includePreferNotToSay: checked })}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* Required switch */}
        {isDefaultLang && (
          <>
            <Separator />
            <div className="flex items-center justify-between pt-1">
              <div className="space-y-0.5">
                <Label htmlFor="q-required" className="text-xs font-medium text-foreground/90">Required field</Label>
                <p className="text-xs text-muted-foreground/80">Participant must answer to submit</p>
              </div>
              <Switch
                id="q-required"
                checked={question.required ?? false}
                onCheckedChange={(checked) => onUpdate({ ...question, required: checked })}
              />
            </div>
          </>
        )}
      </div>

      {supportsAIGen && (
        <Dialog open={isAIModalOpen} onOpenChange={setIsAIModalOpen}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#5D3FD3] dark:text-[#9D7CFF]" />
                {question.type === 'story-question'
                  ? 'Story Question AI Assistant'
                  : question.type === 'slider'
                  ? 'Slider Questions AI Assistant'
                  : question.type === 'triangle'
                  ? 'Triangle Questions AI Assistant'
                  : 'Participant Questions AI Assistant'}
              </DialogTitle>
              <DialogDescription>
                {question.type === 'story-question'
                  ? 'Generate a story question from your project context or refine your current question with AI.'
                  : 'Generate up to 3 questions from your project context. Apply one to the selected card or add all 3 as form elements.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {validationResult && !validationResult.isValid && (
                <PhasePrerequisitesWarning validationResult={validationResult} />
              )}

              <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {question.type === 'story-question' ? 'Current Story Question' : 'Current Question'}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isGenerating || Boolean(validationResult && !validationResult.isValid)}
                    onClick={() => {
                      if (!activeProject?.id) return;
                      void (async () => {
                        setGenError(null);
                        const validation = await validateDesignPhasePrerequisites(activeProject.id);
                        setValidationResult(validation);
                        if (!validation.isValid) return;

                        setIsGenerating(true);
                        try {
                          const q = latestQuestionRef.current;
                          if (q.type === 'story-question') {
                            const contextData = await prepareProjectContext(activeProject);
                            const projectName = activeProject.name || 'Project';
                            const res = await aiAssistantService.callAssistant({
                              prompt: `Suggest a story question that is specific to the project "${projectName}" based on the project goals and focus`,
                              projectContext: contextData?.context || '',
                              mode: 'storyQuestion',
                              promptKey: 'story_question_prompt',
                              promptVariables: { projectName },
                            });
                            if (res.error) {
                              setGenError(res.error);
                            } else if (res.response) {
                              onUpdate({
                                ...latestQuestionRef.current,
                                label: processGeneratedQuestion(res.response),
                                translations: undefined,
                              });
                            }
                          } else if (q.type === 'slider') {
                            const factors = await getInfluencingFactors();
                            const sliders = await generateWithAI(
                              factors && factors.length > 0 ? factors : ['General experience'],
                              activeProject
                            );
                            if (!sliders || sliders.length === 0) {
                              setGenError('Unable to generate slider questions right now. Please try again in a few moments.');
                            } else {
                              setSuggestedItems(
                                sliders.slice(0, 3).map((s) => ({
                                  ...q,
                                  id: generateUUID(),
                                  type: 'slider' as const,
                                  label: s.question,
                                  theme: s.theme,
                                  translations: undefined,
                                  sliderConfig: {
                                    ...(q.sliderConfig || { min: 0, max: 100, step: 1, defaultValue: 50 }),
                                    leftLabel: s.leftLabel,
                                    rightLabel: s.rightLabel,
                                  },
                                }))
                              );
                            }
                          } else if (q.type === 'triangle') {
                            const triangles = await generateTriangleQuestionsWithAI(activeProject);
                            if (!triangles || triangles.length === 0) {
                              setGenError('Unable to generate triangle questions right now. Please try again in a few moments.');
                            } else {
                              setSuggestedItems(
                                triangles.slice(0, 3).map((t) => ({
                                  ...q,
                                  id: generateUUID(),
                                  type: 'triangle' as const,
                                  label: t.question,
                                  theme: t.theme,
                                  translations: undefined,
                                  triangleConfig: {
                                    topLabel: t.topLabel,
                                    bottomLeftLabel: t.bottomLeftLabel,
                                    bottomRightLabel: t.bottomRightLabel,
                                  },
                                }))
                              );
                            }
                          } else if (q.type === 'participant-questions') {
                            const pqs = await generateParticipantQuestionsWithAI(activeProject);
                            if (!pqs || pqs.length === 0) {
                              setGenError('Unable to generate participant questions right now. Please try again in a few moments.');
                            } else {
                              setSuggestedItems(
                                pqs.slice(0, 3).map((p) => ({
                                  ...q,
                                  id: generateUUID(),
                                  type: 'participant-questions' as const,
                                  label: p.label,
                                  translations: undefined,
                                  includePreferNotToSay: q.includePreferNotToSay ?? true,
                                  options: p.choices.map((c) => ({ id: c.id, label: c.label })),
                                }))
                              );
                            }
                          }
                        } catch {
                          setGenError('Unable to generate a question right now. Please try again in a few moments.');
                        } finally {
                          setIsGenerating(false);
                        }
                      })();
                    }}
                    className={AI_BUTTON_CLASS}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        {question.type === 'story-question'
                          ? effectiveLabel
                            ? 'Re-generate with AI'
                            : 'Generate with AI'
                          : suggestedItems.length > 0
                          ? 'Re-generate 3 Questions'
                          : 'Generate 3 Questions'}
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {effectiveLabel || 'No question set yet.'}
                </p>
                {genError && <p className="text-xs text-destructive">{genError}</p>}
              </div>

              {question.type === 'story-question' ? (
                <QuestionImprover
                  initialQuestion={effectiveLabel}
                  onAcceptImprovement={(improved) => updateField('label', improved)}
                />
              ) : (
                suggestedItems.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground/90">
                        AI Suggestions ({suggestedItems.length})
                      </span>
                      {suggestedItems.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const [first, ...rest] = suggestedItems;
                            onUpdate({ ...first, id: latestQuestionRef.current.id }, rest);
                            setIsAIModalOpen(false);
                          }}
                          className="h-7 text-xs gap-1.5 bg-[#5D3FD3] hover:bg-[#4D32B8] text-white"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Add all {suggestedItems.length} to form
                        </Button>
                      )}
                    </div>

                    {suggestedItems.map((item, idx) => (
                      <div key={item.id} className="p-3 rounded-lg border border-border bg-card space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                              {item.theme && (
                                <Badge variant="secondary" className="text-xs py-0 px-1.5 font-normal">
                                  {item.theme}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs font-medium text-foreground">{item.label}</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              onUpdate({ ...item, id: latestQuestionRef.current.id });
                              setIsAIModalOpen(false);
                            }}
                            className="h-7 text-xs shrink-0"
                          >
                            Use this one
                          </Button>
                        </div>

                        {item.type === 'slider' && item.sliderConfig && (
                          <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                            <span>{item.sliderConfig.leftLabel}</span>
                            <span>↔</span>
                            <span>{item.sliderConfig.rightLabel}</span>
                          </div>
                        )}

                        {item.type === 'triangle' && item.triangleConfig && (
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                            <span>▲ {item.triangleConfig.topLabel}</span>
                            <span>•</span>
                            <span>◣ {item.triangleConfig.bottomLeftLabel}</span>
                            <span>•</span>
                            <span>◢ {item.triangleConfig.bottomRightLabel}</span>
                          </div>
                        )}

                        {item.type === 'participant-questions' && item.options && (
                          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/50">
                            {item.options.map((opt) => (
                              <Badge key={opt.id} variant="outline" className="text-xs font-normal py-0">
                                {opt.label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </aside>
  );
};
