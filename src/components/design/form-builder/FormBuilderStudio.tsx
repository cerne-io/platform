import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CerneBuilderQuestion, CerneQuestionType, createDefaultQuestion } from './types';
import { generateUUID } from '@/utils/uuid';
import { SortableQuestionCard } from './SortableQuestionCard';
import { getPreferNotToSayLabel } from '@/utils/formDefaultTranslations';
import i18n from '@/i18n';
import { InspectorPanel } from './InspectorPanel';
import { useProject } from '@/contexts/ProjectContext';
import { getProjectLanguages, ProjectLanguages, DEFAULT_LANGUAGES } from '@/services/formLanguageService';
import { saveActivityResponse } from '@/services/supabaseSync/operations/save/saveActivityResponse';
import { saveQuestionType, QuestionType } from '@/services/formConfig/questionTypeService';
import { safeParseStoryQuestion } from '@/utils/formLocalization';
import { saveStoryQuestionWithSync } from '@/services/sync/storyQuestionSyncService';
import { saveSliderQuestionsWithSync } from '@/services/sync/sliderQuestionsSyncService';
import { saveTriangleQuestionsWithSync } from '@/services/sync/triangleQuestionsSyncService';
import { saveParticipantQuestionsWithSync } from '@/services/sync/participantQuestionsSyncService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useInvalidateDesign } from '@/hooks/mutations/useInvalidateDesign';
import { useFormDataQuery, formDataQueryKey } from '@/hooks/queries/useFormDataQuery';
import { sliderQuestionsQueryKey } from '@/hooks/queries/useSliderQuestionsQuery';
import { participantQuestionsQueryKey } from '@/hooks/queries/useParticipantQuestionsQuery';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Eye, Loader2, CheckCircle2, AlertCircle, PlusCircle, Save, AlignLeft, SlidersHorizontal, Triangle, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FormProvider } from '@/contexts/form';
import StoryForm from '@/components/collect/StoryForm';
import { SliderQuestion, TriangleQuestion, ParticipantQuestion } from '@/services/types/designTypes';

interface FormBuilderStudioProps {
  projectId?: string;
}

function DroppableCanvasArea({
  questions,
  activeId,
  onSelect,
  onDelete,
  onDuplicate,
  onAddQuestion,
  preferredLang = 'en',
}: {
  questions: CerneBuilderQuestion[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAddQuestion: (typeOrId: CerneQuestionType | string) => void;
  preferredLang?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'form-builder-canvas' });
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('text/cerne-question-type')) {
      e.preventDefault();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    const type = e.dataTransfer.getData('text/cerne-question-type');
    if (type) {
      e.preventDefault();
      setIsDragOver(false);
      onAddQuestion(type);
    }
  };

  if (questions.length === 0) {
    return (
      <main
        ref={setNodeRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 m-4 md:m-8 border border-border/80 rounded-2xl flex flex-col items-center justify-center p-8 md:p-12 text-center transition-all duration-300 ease-smooth ${
          isOver || isDragOver ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.03]' : 'bg-card/40'
        }`}
      >
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/20">
            <PlusCircle className="h-6 w-6" />
          </div>
          <h2 className="text-base font-semibold text-foreground tracking-tight [text-wrap:balance]">
            Construct your narrative instrument
          </h2>
          <p className="text-xs text-muted-foreground mt-1.5 mb-6 leading-relaxed [text-wrap:pretty]">
            Drag elements from the sidebar or select a question starter below to begin assembling prompts and sensemaking frameworks.
          </p>

          <div className="grid grid-cols-2 gap-2.5 w-full text-left">
            <button
              type="button"
              onClick={() => onAddQuestion('story-question')}
              className="flex items-center gap-2.5 p-3 rounded-lg border border-border/70 bg-card hover:bg-muted/40 hover:border-primary/40 active:scale-[0.98] transition-all duration-200 cursor-pointer text-xs group"
            >
              <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <AlignLeft className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-medium text-foreground block truncate">Story Prompt</span>
                <span className="text-xs text-muted-foreground/80 truncate block">Open narrative</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onAddQuestion('slider')}
              className="flex items-center gap-2.5 p-3 rounded-lg border border-border/70 bg-card hover:bg-muted/40 hover:border-primary/40 active:scale-[0.98] transition-all duration-200 cursor-pointer text-xs group"
            >
              <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-medium text-foreground block truncate">Slider</span>
                <span className="text-xs text-muted-foreground/80 truncate block">2 choice spectrum</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onAddQuestion('triangle')}
              className="flex items-center gap-2.5 p-3 rounded-lg border border-border/70 bg-card hover:bg-muted/40 hover:border-primary/40 active:scale-[0.98] transition-all duration-200 cursor-pointer text-xs group"
            >
              <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Triangle className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-medium text-foreground block truncate">Triangle</span>
                <span className="text-xs text-muted-foreground/80 truncate block">3-corner balance</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onAddQuestion('participant-questions')}
              className="flex items-center gap-2.5 p-3 rounded-lg border border-border/70 bg-card hover:bg-muted/40 hover:border-primary/40 active:scale-[0.98] transition-all duration-200 cursor-pointer text-xs group"
            >
              <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Users className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-medium text-foreground block truncate">Participant Question</span>
                <span className="text-xs text-muted-foreground/80 truncate block">Single selection</span>
              </div>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      ref={setNodeRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 overflow-y-auto p-4 md:p-8 space-y-4 transition-colors duration-300 ease-smooth ${
        isOver || isDragOver ? 'bg-primary/[0.02]' : ''
      }`}
    >
      <div className="max-w-3xl mx-auto space-y-4">
        <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          {questions.map((question, index) => (
            <SortableQuestionCard
              key={question.id}
              question={question}
              index={index}
              isActive={question.id === activeId}
              onSelect={() => onSelect(question.id)}
              onDelete={() => onDelete(question.id)}
              onDuplicate={() => onDuplicate(question.id)}
              preferredLang={preferredLang}
            />
          ))}
        </SortableContext>
      </div>
    </main>
  );
}

export const FormBuilderStudio: React.FC<FormBuilderStudioProps> = ({ projectId: propProjectId }) => {
  const { activeProject, currentUserProjectRole } = useProject();
  const isReadOnly = currentUserProjectRole === 'viewer';
  const projectId = propProjectId || activeProject?.id || '';
  const queryClient = useQueryClient();
  const invalidateDesign = useInvalidateDesign();

  const [questions, setQuestions] = useState<CerneBuilderQuestion[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [languages, setLanguages] = useState<ProjectLanguages>(DEFAULT_LANGUAGES);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const { toast } = useToast();

  // Check if project has collected stories (lightweight head query, bypasses heavy payload & AI enrichment)
  const { data: hasStories = false } = useQuery({
    queryKey: ['hasStories', projectId],
    queryFn: async () => {
      if (!projectId) return false;
      const { count, error } = await supabase
        .from('stories')
        .select('*', { count: 'exact', head: true })
        .eq('st_project_id', projectId);
      if (error) return false;
      return (count ?? 0) > 0;
    },
    enabled: Boolean(projectId),
    staleTime: 60000,
  });

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQuestionsRef = useRef<CerneBuilderQuestion[]>(questions);
  latestQuestionsRef.current = questions;

  // Load language settings for translations
  useEffect(() => {
    if (!projectId) return;
    void getProjectLanguages(projectId).then((config) => {
      setLanguages(config);
      if (config?.enabledLanguages && config.enabledLanguages.length > 0) {
        void i18n.loadLanguages(config.enabledLanguages);
      }
    });
  }, [projectId]);

  // Listen for externally created/updated builder questions (e.g., from Create Form in Context & Framing)
  useEffect(() => {
    const handleCreated = (e: Event) => {
      const customEvent = e as CustomEvent<{ projectId?: string; questions?: CerneBuilderQuestion[] }>;
      if (customEvent.detail?.projectId && customEvent.detail.projectId !== projectId) return;
      if (customEvent.detail?.questions && Array.isArray(customEvent.detail.questions)) {
        setQuestions(customEvent.detail.questions);
        setActiveQuestionId(null);
        setHasLoadedInitial(true);
      }
    };
    window.addEventListener('form_builder_questions_updated', handleCreated);
    return () => {
      window.removeEventListener('form_builder_questions_updated', handleCreated);
    };
  }, [projectId]);

  // Load existing form data into builder questions
  const { data: initialFormData, isLoading: isInitialLoading } = useFormDataQuery(projectId, false, undefined, {
    enabled: Boolean(projectId) && !hasLoadedInitial,
  });

  useEffect(() => {
    if (!initialFormData || hasLoadedInitial) return;

    const loaded: CerneBuilderQuestion[] = [];
    const defaultLang = languages.defaultLanguage || 'en';

    function unpackLocalizedField(
      raw: unknown,
      lang: string
    ): { primaryText: string; translations: Record<string, string> } {
      if (raw === null || raw === undefined) {
        return { primaryText: '', translations: {} };
      }

      const parsed = safeParseStoryQuestion(raw);

      if (typeof parsed === 'object' && parsed !== null) {
        const entries = Object.entries(parsed).filter(
          ([_, v]) => typeof v === 'string' && v.trim() !== ''
        );
        if (entries.length > 0) {
          const primaryText =
            (typeof parsed[lang] === 'string' ? parsed[lang] : '') ||
            (typeof parsed['en'] === 'string' ? parsed['en'] : '') ||
            entries[0][1] ||
            '';

          const trans: Record<string, string> = {};
          entries.forEach(([l, text]) => {
            if (l !== lang && typeof text === 'string') {
              trans[l] = text;
            }
          });
          return { primaryText, translations: trans };
        }
      }

      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const obj = JSON.parse(trimmed);
            if (obj && typeof obj === 'object') {
              return unpackLocalizedField(obj, lang);
            }
          } catch {
            // Keep raw string
          }
        }
        return { primaryText: raw, translations: {} };
      }

      return { primaryText: String(raw), translations: {} };
    }

    // Direct restoration if canvas layout already saved
    if (initialFormData.formBuilderQuestions && initialFormData.formBuilderQuestions.length > 0) {
      setQuestions(
        initialFormData.formBuilderQuestions.map((q) =>
          q.type === 'multiple-choice' &&
          (q.includePreferNotToSay === true ||
            q.label === 'Participant Questions' ||
            q.id?.startsWith('participant-') ||
            q.id?.startsWith('pq-'))
            ? { ...q, type: 'participant-questions', includePreferNotToSay: q.includePreferNotToSay ?? true }
            : q
        )
      );
      setHasLoadedInitial(true);
      return;
    }

    // 1. Story Question
    if (initialFormData.storyQuestion) {
      const { primaryText, translations } = unpackLocalizedField(
        initialFormData.storyQuestion,
        defaultLang
      );

      if (primaryText.trim()) {
        const transRecord: Record<string, { label: string }> = {};
        Object.entries(translations).forEach(([l, t]) => {
          transRecord[l] = { label: t };
        });

        loaded.push({
          id: 'story-question-1',
          type: 'story-question',
          label: primaryText,
          placeholder: 'Please share your experience here...',
          required: true,
          translations: Object.keys(transRecord).length > 0 ? transRecord : undefined,
        });
      }
    }

    // 1b. Default Emotional Response
    if (initialFormData.emotionalResponseQuestion) {
      loaded.push(initialFormData.emotionalResponseQuestion);
    } else {
      loaded.push(createDefaultQuestion('emotional-response'));
    }

    // 2. Slider Questions
    if (Array.isArray(initialFormData.sliderQuestions)) {
      initialFormData.sliderQuestions.forEach((sq: SliderQuestion, idx: number) => {
        const { primaryText, translations: extraTrans } = unpackLocalizedField(
          sq.question,
          defaultLang
        );
        const transRecord: CerneBuilderQuestion['translations'] = {};
        if (sq.translations) {
          Object.entries(sq.translations).forEach(([l, t]) => {
            transRecord[l] = {
              label: t.question,
              theme: t.theme,
              leftLabel: t.leftLabel,
              rightLabel: t.rightLabel,
            };
          });
        }
        Object.entries(extraTrans).forEach(([l, t]) => {
          transRecord[l] = { ...(transRecord[l] || {}), label: t };
        });

        loaded.push({
          id: `slider-${sq.id || idx + 1}`,
          type: 'slider',
          label: primaryText,
          theme: sq.theme || 'Dimension',
          required: true,
          sliderConfig: {
            leftLabel: sq.leftLabel || 'Low',
            rightLabel: sq.rightLabel || 'High',
            min: 0,
            max: 100,
            step: 1,
            defaultValue: sq.sliderValue ?? 50,
          },
          translations: Object.keys(transRecord).length > 0 ? transRecord : undefined,
        });
      });
    }

    // 3. Triangle Questions
    if (Array.isArray(initialFormData.triangleQuestions)) {
      initialFormData.triangleQuestions.forEach((tq: TriangleQuestion, idx: number) => {
        const { primaryText, translations: extraTrans } = unpackLocalizedField(
          tq.question,
          defaultLang
        );
        const transRecord: CerneBuilderQuestion['translations'] = {};
        if (tq.translations) {
          Object.entries(tq.translations).forEach(([l, t]) => {
            transRecord[l] = {
              label: t.question,
              theme: t.theme,
              topLabel: t.topLabel,
              bottomLeftLabel: t.bottomLeftLabel,
              bottomRightLabel: t.bottomRightLabel,
            };
          });
        }
        Object.entries(extraTrans).forEach(([l, t]) => {
          transRecord[l] = { ...(transRecord[l] || {}), label: t };
        });

        loaded.push({
          id: `triangle-${tq.id || idx + 1}`,
          type: 'triangle',
          label: primaryText,
          theme: tq.theme || 'Balance',
          required: true,
          triangleConfig: {
            topLabel: tq.topLabel || 'Top',
            bottomLeftLabel: tq.bottomLeftLabel || 'Bottom Left',
            bottomRightLabel: tq.bottomRightLabel || 'Bottom Right',
            defaultX: tq.defaultX,
            defaultY: tq.defaultY,
          },
          translations: Object.keys(transRecord).length > 0 ? transRecord : undefined,
        });
      });
    }

    // 4. Participant Questions
    if (Array.isArray(initialFormData.participantQuestions)) {
      initialFormData.participantQuestions.forEach((pq: ParticipantQuestion, idx: number) => {
        const { primaryText, translations: extraTrans } = unpackLocalizedField(
          pq.label,
          defaultLang
        );
        const mergedTrans: Record<string, { label: string }> = {};
        if (pq.translations) {
          Object.entries(pq.translations).forEach(([k, v]) => {
            mergedTrans[k] = { label: v };
          });
        }
        Object.entries(extraTrans).forEach(([l, t]) => {
          mergedTrans[l] = { ...(mergedTrans[l] || {}), label: t };
        });

        const includeOptOut = pq.includePreferNotToSay ?? (Boolean(pq.id && pq.id.startsWith('participant-')));
        const qType: CerneQuestionType =
          pq.questionType === 'checkboxes' || (pq as unknown as { type?: string }).type === 'checkboxes'
            ? 'checkboxes'
            : includeOptOut
            ? 'participant-questions'
            : 'multiple-choice';

        loaded.push({
          id: pq.id || `participant-${idx + 1}`,
          type: qType,
          label: primaryText,
          required: false,
          includePreferNotToSay: includeOptOut,
          options: (pq.choices || []).map((c) => {
            const { primaryText: optText } = unpackLocalizedField(c.label, defaultLang);
            return { id: c.id, label: optText };
          }).filter((c) => c.id !== 'prefer-not-to-say'),
          translations: Object.keys(mergedTrans).length > 0 ? mergedTrans : undefined,
        });
      });
    }

    // If nothing exists, seed with default story question + 1 slider
    if (loaded.length === 0) {
      loaded.push(createDefaultQuestion('story-question'));
    }

    setQuestions(loaded);
    setHasLoadedInitial(true);
  }, [initialFormData, hasLoadedInitial, languages.defaultLanguage]);

  // Autosave: strictly maintains the elements on the builder canvas and updates draft state
  const persistBuilderDraft = useCallback(
    async (items: CerneBuilderQuestion[]) => {
      if (!projectId) return;
      setSaveStatus('saving');
      try {
        await saveActivityResponse(projectId, 'design', 'form-builder', 'form-builder-questions', items);
        void queryClient.invalidateQueries({ queryKey: formDataQueryKey(projectId, false) });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to autosave builder layout:', err);
        setSaveStatus('error');
      }
    },
    [projectId, queryClient]
  );

  // Trigger debounced autosave on change
  const triggerAutoSave = useCallback(
    (newQuestions: CerneBuilderQuestion[]) => {
      if (!hasLoadedInitial) return;
      setQuestions(newQuestions);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      setSaveStatus('saving');
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null;
        void persistBuilderDraft(newQuestions);
      }, 700);
    },
    [hasLoadedInitial, persistBuilderDraft]
  );

  // Flush pending autosave on unmount so quick navigation never loses edits
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        void persistBuilderDraft(latestQuestionsRef.current);
      }
    };
  }, [persistBuilderDraft]);

  // Publish form elements to live /form and /interviewer
  const executePublishForm = useCallback(async () => {
    if (!projectId) return;
    setIsPublishing(true);
    const items = latestQuestionsRef.current;

    try {
      // 1. Extract story question(s)
      const storyQs = items.filter((q) => q.type === 'story-question');
      const primaryStoryQ = storyQs[0];
      if (primaryStoryQ) {
        const defaultLang = languages.defaultLanguage || 'en';
        let storyQuestionToSave: string | Record<string, string> = primaryStoryQ.label;

        if (primaryStoryQ.translations && Object.keys(primaryStoryQ.translations).length > 0) {
          const multiLang: Record<string, string> = {
            [defaultLang]: primaryStoryQ.label,
          };
          Object.entries(primaryStoryQ.translations).forEach(([lang, t]) => {
            if (t?.label) {
              multiLang[lang] = t.label;
            }
          });
          storyQuestionToSave = multiLang;
        }

        await saveStoryQuestionWithSync(projectId, storyQuestionToSave);
        await saveActivityResponse(projectId, 'design', 'story-question', 'story-questions', {
          story_question: storyQuestionToSave,
        });
      }

      // 2. Extract slider question(s)
      const sliderQs: SliderQuestion[] = items
        .filter((q) => q.type === 'slider')
        .map((q, idx) => ({
          id: idx + 1,
          theme: q.theme || 'Dimension',
          question: q.label,
          leftLabel: q.sliderConfig?.leftLabel || 'Low',
          rightLabel: q.sliderConfig?.rightLabel || 'High',
          sliderValue: q.sliderConfig?.defaultValue ?? 50,
          translations: q.translations
            ? Object.fromEntries(
                Object.entries(q.translations).map(([l, t]) => [
                  l,
                  {
                    question: t.label,
                    theme: t.theme,
                    leftLabel: t.leftLabel,
                    rightLabel: t.rightLabel,
                  },
                ])
              )
            : undefined,
        }));

      await saveSliderQuestionsWithSync(projectId, sliderQs);

      // 3. Extract triangle question(s)
      const triangleQs: TriangleQuestion[] = items
        .filter((q) => q.type === 'triangle')
        .map((q, idx) => ({
          id: idx + 1,
          theme: q.theme || 'Balance',
          question: q.label,
          topLabel: q.triangleConfig?.topLabel || 'Top',
          bottomLeftLabel: q.triangleConfig?.bottomLeftLabel || 'Bottom Left',
          bottomRightLabel: q.triangleConfig?.bottomRightLabel || 'Bottom Right',
          translations: q.translations
            ? Object.fromEntries(
                Object.entries(q.translations).map(([l, t]) => [
                  l,
                  {
                    question: t.label,
                    theme: t.theme,
                    topLabel: t.topLabel,
                    bottomLeftLabel: t.bottomLeftLabel,
                    bottomRightLabel: t.bottomRightLabel,
                  },
                ])
              )
            : undefined,
        }));

      await saveTriangleQuestionsWithSync(triangleQs, projectId);

      // 4. Extract participant question(s) & additional choice questions
      const participantQs: ParticipantQuestion[] = items
        .filter((q) => q.type === 'participant-questions' || q.type === 'multiple-choice' || q.type === 'checkboxes')
        .map((q, idx) => ({
          id: q.id || `participant-${idx + 1}`,
          label: q.label,
          questionType: q.type === 'checkboxes' ? 'checkboxes' : 'multiple-choice',
          includePreferNotToSay: Boolean(q.includePreferNotToSay),
          choices: (q.options || []).map((opt) => ({
            id: opt.id,
            label: opt.label,
            translations: opt.translations,
          })),
          translations: q.translations
            ? Object.fromEntries(
                Object.entries(q.translations)
                  .filter(([, v]) => Boolean(v.label))
                  .map(([k, v]) => [k, v.label!])
              )
            : undefined,
        }));

      const hasAnyOptOut = participantQs.some((q) => q.includePreferNotToSay);
      await saveParticipantQuestionsWithSync(projectId, participantQs, hasAnyOptOut);

      // 5. Compute questionType ('slider' | 'triangle' | 'both')
      let derivedType: QuestionType = 'slider';
      if (sliderQs.length > 0 && triangleQs.length > 0) {
        derivedType = 'both';
      } else if (triangleQs.length > 0) {
        derivedType = 'triangle';
      } else {
        derivedType = 'slider';
      }
      await saveQuestionType(projectId, derivedType);

      // 6. Save raw canvas order (both canonical design location and public-form location)
      await saveActivityResponse(projectId, 'design', 'form-builder', 'form-builder-questions', items);
      await saveActivityResponse(projectId, 'collection', 'public-form', 'form-builder-questions', items);

      // Invalidate queries & purge Cloudflare edge cache so /form and interviewer update immediately
      invalidateDesign(projectId);
      void queryClient.invalidateQueries({ queryKey: sliderQuestionsQueryKey(projectId, false) });
      void queryClient.invalidateQueries({ queryKey: sliderQuestionsQueryKey(projectId, true) });
      void queryClient.invalidateQueries({ queryKey: participantQuestionsQueryKey(projectId) });

      setSaveStatus('saved');
      toast({
        title: 'Form & Interviewer Updated',
        description: 'Questions have been successfully published to the live form and interviewer.',
      });
    } catch (err) {
      console.error('Failed to update form & interviewer:', err);
      setSaveStatus('error');
      toast({
        title: 'Save Failed',
        description: 'Failed to update the form and interviewer. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  }, [projectId, queryClient, languages.defaultLanguage, toast, invalidateDesign]);

  const handleSaveFormClick = useCallback(() => {
    if (hasStories) {
      setIsAlertOpen(true);
    } else {
      void executePublishForm();
    }
  }, [hasStories, executePublishForm]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDraggingId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingId(null);
      const { active, over } = event;
      if (!over) return;

      // Reordering within canvas
      if (active.id !== over.id) {
        const oldIndex = questions.findIndex((q) => q.id === active.id);
        const newIndex = questions.findIndex((q) => q.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          triggerAutoSave(arrayMove(questions, oldIndex, newIndex));
        }
      }
    },
    [questions, triggerAutoSave]
  );

  const handleAddQuestion = useCallback(
    (typeOrId: CerneQuestionType | string) => {
      const newQ = createDefaultQuestion(typeOrId);
      triggerAutoSave([...questions, newQ]);
      setActiveQuestionId(newQ.id);
    },
    [questions, triggerAutoSave]
  );

  // Listen for add question requests triggered from the Design Sidebar
  useEffect(() => {
    const handleAddEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ type: string }>;
      if (customEvent.detail?.type) {
        handleAddQuestion(customEvent.detail.type);
      }
    };
    window.addEventListener('cerne:add-builder-question', handleAddEvent);
    return () => window.removeEventListener('cerne:add-builder-question', handleAddEvent);
  }, [handleAddQuestion]);

  const handleDelete = useCallback(
    (id: string) => {
      const filtered = questions.filter((q) => q.id !== id);
      triggerAutoSave(filtered);
      if (activeQuestionId === id) {
        setActiveQuestionId(null);
      }
    },
    [questions, activeQuestionId, triggerAutoSave]
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      const idx = questions.findIndex((q) => q.id === id);
      if (idx === -1) return;
      const clone: CerneBuilderQuestion = {
        ...questions[idx],
        id: generateUUID(),
        label: `${questions[idx].label} (Copy)`,
      };
      const copy = [...questions];
      copy.splice(idx + 1, 0, clone);
      triggerAutoSave(copy);
      setActiveQuestionId(clone.id);
    },
    [questions, triggerAutoSave]
  );

  const handleUpdate = useCallback(
    (updated: CerneBuilderQuestion, extraQuestions?: CerneBuilderQuestion[]) => {
      const idx = questions.findIndex((q) => q.id === updated.id);
      if (idx === -1) return;
      const next = [...questions];
      if (extraQuestions && extraQuestions.length > 0) {
        next.splice(idx, 1, updated, ...extraQuestions);
      } else {
        next[idx] = updated;
      }
      triggerAutoSave(next);
    },
    [questions, triggerAutoSave]
  );

  const activeQuestion = questions.find((q) => q.id === activeQuestionId);

  // Form values for live preview modal
  const previewInitialValues = {
    storyQuestion: questions.find((q) => q.type === 'story-question')?.label || 'Please share your story...',
    emotionalResponseQuestion: questions.find((q) => q.type === 'emotional-response') || null,
    sliderQuestions: questions
      .filter((q) => q.type === 'slider')
      .map((q, idx) => ({
        id: idx + 1,
        theme: q.theme || 'Dimension',
        question: q.label,
        leftLabel: q.sliderConfig?.leftLabel || 'Low',
        rightLabel: q.sliderConfig?.rightLabel || 'High',
        sliderValue: q.sliderConfig?.defaultValue ?? 50,
      })),
    triangleQuestions: questions
      .filter((q) => q.type === 'triangle')
      .map((q, idx) => ({
        id: idx + 1,
        theme: q.theme || 'Balance',
        question: q.label,
        topLabel: q.triangleConfig?.topLabel || 'Top',
        bottomLeftLabel: q.triangleConfig?.bottomLeftLabel || 'Bottom Left',
        bottomRightLabel: q.triangleConfig?.bottomRightLabel || 'Bottom Right',
      })),
    participantQuestions: questions
      .filter((q) => q.type === 'participant-questions' || q.type === 'multiple-choice' || q.type === 'checkboxes')
      .map((q, idx) => ({
        id: q.id || `preview-p-${idx}`,
        label: q.label,
        questionType: q.type === 'checkboxes' ? ('checkboxes' as const) : ('multiple-choice' as const),
        includePreferNotToSay: q.includePreferNotToSay,
        choices: [
          ...(q.options || []).map((o) => ({ id: o.id, label: o.label })),
          ...(q.includePreferNotToSay ? [{ id: 'prefer-not-to-say', label: getPreferNotToSayLabel(languages?.defaultLanguage) }] : []),
        ],
      })),
  };

  if (isInitialLoading && !hasLoadedInitial) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading form questions...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Builder Top Bar */}
      <header className="h-16 border-b border-border bg-card/75 backdrop-blur-md px-4 md:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight [text-wrap:balance]">Form Builder</h1>
            <span className="text-xs md:text-sm text-muted-foreground font-normal tabular-nums">
              ({questions.length} {questions.length === 1 ? 'element' : 'elements'})
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {saveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="inline-flex items-center gap-1.5 text-destructive font-medium">
                <AlertCircle className="h-3.5 w-3.5" /> Save failed
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-medium active:scale-[0.98] transition-all duration-150"
            onClick={() => setIsPreviewOpen(true)}
          >
            <Eye className="h-3.5 w-3.5" /> Preview Form
          </Button>

          <Button
            type="button"
            size="sm"
            className="gap-1.5 text-xs font-medium shadow-xs active:scale-[0.98] transition-all duration-150"
            onClick={handleSaveFormClick}
            disabled={isPublishing || isReadOnly}
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Form</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Studio Area */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex overflow-hidden">
          {/* 1. Middle Droppable Canvas (Full width) */}
          <DroppableCanvasArea
            questions={questions}
            activeId={activeQuestionId}
            onSelect={setActiveQuestionId}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onAddQuestion={handleAddQuestion}
            preferredLang={languages?.defaultLanguage || 'en'}
          />

          {/* 2. Right Property Inspector (Only shown when a question is clicked) */}
          {activeQuestion && (
            <InspectorPanel
              key={activeQuestion.id}
              question={activeQuestion}
              languages={languages}
              onUpdate={handleUpdate}
              onClose={() => setActiveQuestionId(null)}
            />
          )}
        </div>

        {/* Drag Overlay badge */}
        <DragOverlay>
          {draggingId ? (
            <div className="rounded-xl border border-primary/60 bg-card/95 backdrop-blur-md px-4 py-3 shadow-2xl text-xs font-medium text-foreground flex items-center gap-2.5 ring-1 ring-primary/20">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>Moving question element...</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Live Form Preview Dialog (Reusing existing StoryForm) */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader className="mb-4">
            <DialogTitle>Form Preview</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground [text-wrap:pretty]">
              Test how participants experience this form on mobile and web viewports.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-xl border border-border bg-card">
            <FormProvider
              key={isPreviewOpen ? questions.map((q) => `${q.id}-${q.label}`).join(':') : 'closed'}
              initialValues={previewInitialValues}
              onSubmit={async () => {
                // Preview mock submit
                return true;
              }}
            >
              <StoryForm isPublic={false} />
            </FormProvider>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog if form is already collecting */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modify Active Instrument?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed [text-wrap:pretty]">
              This project already has submitted responses. Modifying question keys or options may affect consistency across previously collected narrative data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="active:scale-[0.98] transition-transform duration-150">Keep Current Form</AlertDialogCancel>
            <AlertDialogAction
              className="active:scale-[0.98] transition-transform duration-150"
              onClick={() => void executePublishForm()}
            >
              Confirm Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FormBuilderStudio;
