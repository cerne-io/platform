import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DesignStep } from "@/data/types/designTypes";
import { ActivityFormData } from "@/types/activity";
import StepActivities from "../viewer/StepActivities";
import PublicFooter from "@/components/layout/PublicFooter";
import CreateFormAction from "../discover/CreateFormAction";
import { cn } from "@/lib/utils";

interface DesignMainContentProps {
  projectId?: string;
  currentStep: DesignStep;
  phaseId: string;
  phaseTitle: string;
  stageTitle?: string;
  stageStepNumber?: number;
  stageTotalSteps?: number;
  activityData: { [key: string]: ActivityFormData };
  onStartActivity: (activityId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  isLastStep: boolean;
  stepNumber: number;
  totalSteps: number;
  isTemplateProject: boolean;
  completedActivities?: Set<string>;
  onActivitySaved: (activityId: string) => void;
}

const DesignMainContent: React.FC<DesignMainContentProps> = ({
  projectId,
  currentStep,
  phaseId,
  phaseTitle,
  stageTitle,
  stageStepNumber,
  stageTotalSteps,
  activityData,
  onStartActivity,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  isLastStep,
  stepNumber,
  totalSteps,
  isTemplateProject,
  completedActivities = new Set(),
  onActivitySaved
}) => {
  return (
    <div className="flex-1 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto flex flex-col min-h-full">
        <div className="p-4 md:p-8 flex-1">
          {/* Stage / Phase context */}
          <div className="mb-8 space-y-2">
            {currentStep.id !== "form-languages" && currentStep.id !== "form-appearance" && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/80 border border-border/50 text-xs font-semibold text-muted-foreground tabular-nums">
                {stageTitle
                  ? `${stageTitle} · Step ${stageStepNumber ?? stepNumber} of ${stageTotalSteps ?? totalSteps}`
                  : `${phaseTitle} Phase · Step ${stepNumber} of ${totalSteps}`}
              </div>
            )}
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground [text-wrap:balance]">
              {currentStep.title}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed [text-wrap:pretty]">
              {currentStep.description}
            </p>
          </div>

          {/* Activities */}
          <div className="mb-8">
            {(currentStep.id === "form-languages" || currentStep.id === "form-appearance") && currentStep.activities[0]?.component ? (
              currentStep.activities[0].component
            ) : (
              <StepActivities
                phaseId={phaseId}
                stepId={currentStep.id}
                activities={currentStep.activities}
                activityData={activityData}
                onStartActivity={onStartActivity}
                isTemplateProject={isTemplateProject}
                completedActivities={completedActivities}
                onActivitySaved={onActivitySaved}
              />
            )}
          </div>

          {/* Navigation */}
          {currentStep.id !== "form-languages" && (
            <div className={cn(
              "pt-6 pb-20",
              currentStep.id === "form-appearance"
                ? "w-full flex"
                : "flex justify-center items-center gap-6"
            )}>
              {hasPrevious && currentStep.id !== "form-appearance" && (
                <Button
                  variant="outline"
                  onClick={onPrevious}
                  className="flex items-center gap-2 text-xs md:text-sm active:scale-[0.98] transition-transform duration-150 shadow-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
              )}

              {currentStep.id === "discover" ? (
                <CreateFormAction projectId={projectId} />
              ) : (
                hasNext && (
                  <Button
                    size={currentStep.id === "form-appearance" ? "lg" : "default"}
                    onClick={onNext}
                    className={cn(
                      "flex items-center gap-2 text-xs md:text-sm active:scale-[0.98] transition-transform duration-150 shadow-xs",
                      currentStep.id === "form-appearance" && "w-full justify-center font-medium"
                    )}
                  >
                    {isLastStep ? "Complete & View Form" : "Next"}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )
              )}
            </div>
          )}
        </div>

        <div className="mt-auto">
          <PublicFooter />
        </div>
      </div>
    </div>
  );
};

export default DesignMainContent;
