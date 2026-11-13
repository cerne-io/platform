import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useProjectPhases } from "@/data/designPhases";
import { CheckCircle2, Circle, BookOpen, PenTool } from "lucide-react";
import confetti from "canvas-confetti";
import DesignAssistant from "../DesignAssistant";
import CreateFormAction from "../discover/CreateFormAction";
import QuestionInventory from "../form-builder/QuestionInventory";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface DesignSidebarProps {
  currentStepId: string;
  onStepSelect: (phaseId: string, stepId: string) => void;
  completedSteps?: Set<string>;
  projectId?: string;
  className?: string;
  onClose?: () => void;
}

const STAGE_1_STEP_IDS = ['organization', 'project', 'topic', 'discover'];
const STAGE_2_STEP_IDS = ['form-languages', 'form-builder', 'form-appearance'];

const DesignSidebar: React.FC<DesignSidebarProps> = ({
  currentStepId,
  onStepSelect,
  completedSteps = new Set(),
  projectId,
  className,
  onClose
}) => {
  const designPhases = useProjectPhases();

  const allStepsWithPhase = useMemo(() =>
    designPhases.flatMap(phase =>
      phase.steps.map(step => ({
        ...step,
        phaseId: phase.id,
      }))
    ),
    [designPhases]
  );

  const stage1Steps = useMemo(() =>
    allStepsWithPhase.filter(step => STAGE_1_STEP_IDS.includes(step.id)),
    [allStepsWithPhase]
  );

  const stage2Steps = useMemo(() => {
    const stepMap = new Map(allStepsWithPhase.map(step => [step.id, step]));
    return STAGE_2_STEP_IDS
      .map(id => stepMap.get(id))
      .filter((step): step is NonNullable<typeof step> => Boolean(step));
  }, [allStepsWithPhase]);

  const stage1CompletedCount = useMemo(() =>
    stage1Steps.filter(step => completedSteps.has(step.id)).length,
    [stage1Steps, completedSteps]
  );
  const isStage1Complete = stage1Steps.length > 0 && stage1CompletedCount === stage1Steps.length;

  const stage2CompletedCount = useMemo(() =>
    stage2Steps.filter(step => completedSteps.has(step.id)).length,
    [stage2Steps, completedSteps]
  );
  const stage2Total = stage2Steps.length;
  const isStage2Complete = stage2Total > 0 && stage2CompletedCount === stage2Total;
  const stage2Percentage = stage2Total > 0 ? Math.round((stage2CompletedCount / stage2Total) * 100) : 0;

  const isCurrentInStage1 = useMemo(() =>
    STAGE_1_STEP_IDS.includes(currentStepId),
    [currentStepId]
  );

  // Default open sections: Stage 2 open by default, Stage 1 open if active step is in Stage 1
  const [openSections, setOpenSections] = useState<string[]>(() =>
    isCurrentInStage1 ? ['stage-context', 'stage-design'] : ['stage-design']
  );

  // Auto-expand Stage 1 if user navigates to a Stage 1 step
  useEffect(() => {
    if (isCurrentInStage1) {
      setOpenSections(prev => prev.includes('stage-context') ? prev : [...prev, 'stage-context']);
    }
  }, [isCurrentInStage1]);

  // Trigger confetti when Stage 2 is 100% complete (only once per project)
  useEffect(() => {
    if (!projectId || stage2Percentage !== 100) return;

    const storageKey = `confetti-shown-${projectId}`;
    const hasShownBefore = localStorage.getItem(storageKey);

    if (!hasShownBefore) {
      localStorage.setItem(storageKey, 'true');

      // Fire confetti from multiple angles
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        void confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#8B5CF6', '#EC4899', '#10B981']
        });
        void confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#8B5CF6', '#EC4899', '#10B981']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [stage2Percentage, projectId]);

  return (
    <div className={cn("w-80 bg-background border-r border-border h-full flex flex-col relative z-40", className)}>
      <div className="p-5 border-b border-border/70 space-y-3.5 flex-shrink-0 bg-card/40">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Design Process</h2>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground bg-muted/80 px-2.5 py-0.5 rounded-md border border-border/50">
            {stage2Percentage}%
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Ready to publish</span>
            <span className="font-medium text-foreground tabular-nums">
              {stage2CompletedCount}/{stage2Total} steps
            </span>
          </div>
          <div className="h-1.5 bg-muted/70 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-smooth rounded-full"
              style={{ width: `${stage2Percentage}%` }}
            />
          </div>
        </div>
      </div>

      <nav className="p-3 flex-1 overflow-y-auto">
        <Accordion
          type="multiple"
          value={openSections}
          onValueChange={setOpenSections}
          className="space-y-3"
        >
          {/* Stage 1: Context & Framing */}
          <AccordionItem value="stage-context" className="border-none">
            <AccordionTrigger className="hover:no-underline py-2.5 px-3 rounded-lg hover:bg-muted/50 text-foreground transition-colors group">
              <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <BookOpen className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider truncate">
                  Context & Framing
                </span>
                {isStage1Complete ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-auto" />
                ) : stage1CompletedCount > 0 ? (
                  <span className="text-xs text-muted-foreground shrink-0 ml-auto font-medium tabular-nums bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                    {stage1CompletedCount}/{stage1Steps.length}
                  </span>
                ) : null}
              </div>
            </AccordionTrigger>

            <AccordionContent className="pt-1 pb-0 pl-1">
              <div className="space-y-1">
                {stage1Steps.map((step) => {
                  const isActive = step.id === currentStepId;
                  const isCompleted = completedSteps.has(step.id);

                  return (
                    <Link
                      key={step.id}
                      to={`?step=${step.id}`}
                      data-tour={`design-step-${step.id}`}
                      onClick={() => {
                        onStepSelect(step.phaseId, step.id);
                        onClose?.();
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 flex items-center gap-2.5 group block select-none active:scale-[0.99]",
                        isActive
                          ? "bg-primary/[0.08] text-primary font-medium border-l-2 border-primary shadow-xs"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex-shrink-0">
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Circle className={cn(
                              "h-4 w-4",
                              isActive ? "text-primary" : "text-muted-foreground/40"
                            )} />
                          )}
                        </div>

                        <span className="text-sm font-medium truncate">
                          {step.title}
                        </span>
                      </div>
                    </Link>
                  );
                })}

                <div className="pt-2 pb-1 px-1 flex justify-center">
                  <CreateFormAction
                    projectId={projectId}
                    hasContext={stage1CompletedCount > 0}
                    className="w-full flex"
                    onNavigate={onClose}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Stage 2: Form Design */}
          <AccordionItem value="stage-design" className="border-none">
            <AccordionTrigger className="hover:no-underline py-2.5 px-3 rounded-lg hover:bg-muted/50 text-foreground transition-colors group">
              <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <PenTool className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider truncate">
                  Form Design
                </span>
                {isStage2Complete ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-auto" />
                ) : stage2CompletedCount > 0 ? (
                  <span className="text-xs text-muted-foreground shrink-0 ml-auto font-medium tabular-nums bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                    {stage2CompletedCount}/{stage2Steps.length}
                  </span>
                ) : null}
              </div>
            </AccordionTrigger>

            <AccordionContent className="pt-1 pb-0 pl-1">
              <div className="space-y-1">
                {stage2Steps.map((step) => {
                  const isActive = step.id === currentStepId;
                  const isCompleted = completedSteps.has(step.id);

                  return (
                    <div key={step.id} className="space-y-1">
                      <Link
                        to={`?step=${step.id}`}
                        data-tour={`design-step-${step.id}`}
                        onClick={() => {
                          onStepSelect(step.phaseId, step.id);
                          onClose?.();
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 flex items-center gap-2.5 group block select-none active:scale-[0.99]",
                          isActive
                            ? "bg-primary/[0.08] text-primary font-medium border-l-2 border-primary shadow-xs"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex-shrink-0">
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Circle className={cn(
                                "h-4 w-4",
                                isActive ? "text-primary" : "text-muted-foreground/40"
                              )} />
                            )}
                          </div>

                          <span className="text-sm font-medium truncate">
                            {step.title}
                          </span>
                        </div>
                      </Link>

                      {step.id === 'form-builder' && (
                        <div className="ml-0.5 py-2 my-2">
                          <QuestionInventory
                            onSelectType={() => {
                              if (!isActive) {
                                onStepSelect(step.phaseId, step.id);
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </nav>

      <div className="px-4 pb-6 mt-auto relative z-50">
        <DesignAssistant variant="floating" />
      </div>
    </div>
  );
};

export default DesignSidebar;
