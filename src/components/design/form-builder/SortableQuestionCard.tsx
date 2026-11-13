import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CerneBuilderQuestion } from './types';
import { GripVertical, Trash2, Copy, SlidersHorizontal, Triangle, AlignLeft, Users, CircleDot, CheckSquare, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { getPreferNotToSayLabel } from '@/utils/formDefaultTranslations';

interface SortableQuestionCardProps {
  question: CerneBuilderQuestion;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  preferredLang?: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export function cleanDisplayLabel(label: string, preferredLang = 'en'): string {
  if (!label || typeof label !== 'string') return '';
  const trimmed = label.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return (
          parsed[preferredLang] ||
          parsed.en ||
          Object.values(parsed).find((v) => typeof v === 'string') ||
          label
        );
      }
    } catch {
      // not JSON
    }
  }
  return label;
}

const TYPE_CONFIG = {
  'story-question': { label: 'Story Prompt', icon: AlignLeft },
  'emotional-response': { label: 'Emotional Response', icon: Smile },
  'slider': { label: 'Slider', icon: SlidersHorizontal },
  'triangle': { label: 'Triangle', icon: Triangle },
  'participant-questions': { label: 'Participant Question', icon: Users },
  'multiple-choice': { label: 'Multiple Choice', icon: CircleDot },
  'checkboxes': { label: 'Checkboxes', icon: CheckSquare },
};

function QuestionPreview({ question, preferredLang = 'en' }: { question: CerneBuilderQuestion; preferredLang?: string }) {
  const preferNotToSayText = getPreferNotToSayLabel(preferredLang);
  switch (question.type) {
    case 'story-question':
      return (
        <div className="space-y-2 mt-2">
          <Textarea
            disabled
            placeholder={question.placeholder || 'Participants will type their narrative here...'}
            className="h-20 resize-none opacity-70 text-xs bg-muted/30 cursor-pointer pointer-events-none rounded-lg border-border/60"
          />
        </div>
      );

    case 'slider':
      return (
        <div className="space-y-2 mt-3 p-3 rounded-lg bg-muted/20 border border-border/50">
          <Slider value={[50]} max={100} disabled className="opacity-70 pointer-events-none" />
          <div className="flex justify-between items-start text-xs text-muted-foreground gap-4 font-medium pt-1">
            <span className="flex-1 text-left text-foreground/80">{question.sliderConfig?.leftLabel || 'Left Pole'}</span>
            <span className="flex-1 text-right text-foreground/80">{question.sliderConfig?.rightLabel || 'Right Pole'}</span>
          </div>
        </div>
      );

    case 'triangle':
      return (
        <div className="mt-3 flex flex-col items-center justify-center p-3 rounded-lg bg-muted/20 border border-border/50">
          <span className="text-xs font-semibold text-foreground/90 mb-1">{question.triangleConfig?.topLabel || 'Top Corner'}</span>
          <div className="relative w-36 h-24 my-1">
            <svg viewBox="0 0 100 80" className="w-full h-full stroke-primary fill-primary/10 stroke-[1.5]">
              <polygon points="50,5 95,75 5,75" />
              <circle cx="50" cy="50" r="3" className="fill-primary" />
            </svg>
          </div>
          <div className="w-full flex justify-between text-xs font-semibold text-foreground/90 px-1">
            <span>{question.triangleConfig?.bottomLeftLabel || 'Bottom Left'}</span>
            <span>{question.triangleConfig?.bottomRightLabel || 'Bottom Right'}</span>
          </div>
        </div>
      );

    case 'checkboxes':
      return (
        <div className="space-y-1.5 mt-2.5">
          {question.options?.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-3.5 w-3.5 rounded-xs border border-muted-foreground/60 shrink-0 flex items-center justify-center bg-muted/20" />
              <span className="truncate">{opt.label}</span>
            </div>
          ))}
          {question.includePreferNotToSay && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/70 font-normal pt-0.5">
              <div className="h-3.5 w-3.5 rounded-xs border border-muted-foreground/30 shrink-0" />
              <span>{preferNotToSayText}</span>
            </div>
          )}
        </div>
      );

    case 'participant-questions':
    case 'multiple-choice':
      return (
        <div className="space-y-1.5 mt-2.5">
          {question.options?.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/50 shrink-0" />
              <span className="truncate">{opt.label}</span>
            </div>
          ))}
          {question.includePreferNotToSay && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/70 font-normal pt-0.5">
              <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
              <span>{preferNotToSayText}</span>
            </div>
          )}
        </div>
      );

    case 'emotional-response':
      return (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {question.options?.map((opt) => (
            <span
              key={opt.id}
              className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium border border-primary/20"
            >
              {opt.label}
            </span>
          ))}
        </div>
      );
  }
}

export const SortableQuestionCard: React.FC<SortableQuestionCardProps> = ({
  question,
  index,
  isActive,
  onSelect,
  onDelete,
  onDuplicate,
  preferredLang = 'en',
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeMeta = TYPE_CONFIG[question.type];
  const Icon = typeMeta.icon;

  return (
    <article
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        'group relative rounded-xl border bg-card p-4 transition-all duration-300 ease-smooth cursor-pointer select-none',
        isActive
          ? 'border-primary ring-1 ring-primary/30 shadow-md bg-primary/[0.02]'
          : 'border-border/80 hover:border-primary/40 hover:bg-muted/10 hover:shadow-xs',
        isDragging && 'opacity-30 z-50 ring-2 ring-primary shadow-xl scale-[1.01]'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-0.5 flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground/60 hover:bg-muted hover:text-foreground active:cursor-grabbing active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          title="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground tabular-nums">#{index + 1}</span>
            <Badge
              variant="secondary"
              className="text-xs font-medium py-0.5 px-2 gap-1 text-muted-foreground bg-muted/60 border border-border/40 rounded-md"
            >
              <Icon className="h-3 w-3 text-muted-foreground/80" />
              {typeMeta.label}
            </Badge>
            {question.theme && (
              <Badge variant="secondary" className="text-xs py-0.5 px-2 font-normal rounded-md">
                {question.theme}
              </Badge>
            )}
            {question.required && (
              <span className="text-destructive font-bold text-xs leading-none" title="Required">
                *
              </span>
            )}
          </div>

          <h4 className="text-sm font-semibold text-foreground leading-snug break-words [text-wrap:pretty]">
            {cleanDisplayLabel(question.label, preferredLang)}
          </h4>

          <QuestionPreview question={question} preferredLang={preferredLang} />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-150"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            title="Duplicate question"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all duration-150"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete question"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
};
