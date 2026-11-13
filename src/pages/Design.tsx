import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

import { useProject } from "@/contexts/ProjectContext";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Menu, Compass } from "lucide-react";

// Import the design data
import { useProjectPhases } from "@/data/designPhases";

// Import the components
import DesignSidebar from "@/components/design/sidebar/DesignSidebar";
import DesignMainContent from "@/components/design/sidebar/DesignMainContent";
import DesignHero from "@/components/design/DesignHero";
import FormBuilderStudio from "@/components/design/form-builder/FormBuilderStudio";
import { useActivityDataManager } from "@/components/design/hooks/useActivityDataManager";
import { diagnoseCacheHealth, cleanContaminatedCache } from "@/services/cache/cacheDiagnostics";
import ActivityView from "@/components/design/phase/ActivityView";
import CustomComponentView from "@/components/design/phase/CustomComponentView";
import { useActivityCompletionQuery } from "@/hooks/queries/useActivityCompletionQuery";
import { ContentLoader } from "@/components/ui/ContentLoader";
import { debugLog } from "@/utils/debugLogger";
import {
  getEffectiveProjectId,
  getSavedForkChoice,
  isForkDismissedForProject,
  persistForkChoice
} from "@/services/utils/storageUtils";
import { useForkSync } from "@/pages/hooks/useForkSync";

const STAGE_1_STEP_IDS = ['organization', 'project', 'topic', 'discover'];
const STAGE_2_STEP_IDS = ['form-languages', 'form-builder', 'form-appearance'];
const ALL_STAGE_STEP_IDS = [...STAGE_1_STEP_IDS, ...STAGE_2_STEP_IDS];

const Design = () => {
  const navigate = useNavigate();
  const { activeProject, isLoading } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const stepFromUrl = searchParams.get('step');
  
  const designPhases = useProjectPhases();

  // Memoize allSteps to prevent re-render loops
  const allSteps = useMemo(() => {
    const rawSteps = designPhases.flatMap(phase =>
      phase.steps.map(step => ({
        ...step,
        phaseId: phase.id,
        phaseTitle: phase.title,
        phaseDescription: phase.description
      }))
    );
    const stepMap = new Map(rawSteps.map(step => [step.id, step]));
    const ordered = ALL_STAGE_STEP_IDS
      .map(id => stepMap.get(id))
      .filter((step): step is NonNullable<typeof step> => Boolean(step));
    const extraSteps = rawSteps.filter(step => !ALL_STAGE_STEP_IDS.includes(step.id));
    return [...ordered, ...extraSteps];
  }, [designPhases]);

  const effectiveProjectId = getEffectiveProjectId(activeProject);
  const initialSavedChoice = getSavedForkChoice(effectiveProjectId);

  // Lightweight completion check - only fetches activity IDs, not full data
  const { data: completedActivitiesData, isLoading: isCompletionLoading } = useActivityCompletionQuery(
    activeProject?.id || effectiveProjectId || undefined
  );

  const completedActivities = useMemo(() =>
    completedActivitiesData || new Set<string>(),
    [completedActivitiesData]
  );

  const isDeterminingFork =
    !stepFromUrl &&
    !initialSavedChoice &&
    !isForkDismissedForProject(effectiveProjectId) &&
    isCompletionLoading;

  // Check if we should show the fork screen
  const [showFork, setShowFork] = useState(() => {
    if (stepFromUrl) return false;
    if (initialSavedChoice) return false;
    if (isForkDismissedForProject(effectiveProjectId)) return false;
    return true;
  });

  const [currentStepId, setCurrentStepId] = useState(() => {
    if (stepFromUrl) return stepFromUrl;
    if (initialSavedChoice && allSteps.some(s => s.id === initialSavedChoice)) return initialSavedChoice;
    return 'form-builder'; // default to form-builder for direct building if no saved choice
  });
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Stage calculations
  const isStage1Step = STAGE_1_STEP_IDS.includes(currentStepId);
  const currentStageTitle = isStage1Step ? "Context & Framing" : "Form Design";
  const currentStageStepNumber = isStage1Step
    ? STAGE_1_STEP_IDS.indexOf(currentStepId) + 1
    : STAGE_2_STEP_IDS.indexOf(currentStepId) + 1;
  const currentStageTotalSteps = isStage1Step ? STAGE_1_STEP_IDS.length : STAGE_2_STEP_IDS.length;

  // Memoize current step data
  const currentStepData = useMemo(
    () => allSteps.find(s => s.id === currentStepId) || allSteps[0],
    [currentStepId, allSteps]
  );

  const currentStepIndex = useMemo(
    () => allSteps.findIndex(s => s.id === currentStepId),
    [currentStepId, allSteps]
  );

  // Check if current project is a template
  const isTemplateProject = activeProject?.is_template || false;

  // Initialize activity data manager with current step info
  const {
    activityData,
    handleActivitySaved
  } = useActivityDataManager(
    activeProject?.id,
    currentStepData.phaseId,
    currentStepId,
    currentStepData.activities,
    isTemplateProject
  );

  // Calculate completed steps based on which activities have responses
  useEffect(() => {
    // Template projects are always complete
    if (isTemplateProject) {
      const allStepIds = new Set(allSteps.map(step => step.id));
      setCompletedSteps(allStepIds);
      return;
    }

    // For regular projects, calculate based on activity responses
    const newCompletedSteps = new Set<string>();

    allSteps.forEach(step => {
      // A step is complete if ALL its activities have responses
      const allActivitiesComplete = step.activities.every(activity => {
        // Special case for form-builder studio canvas
        // Form is complete when it has: story question + (slider or triangle question) + participant question
        if (activity.id === 'form-builder-canvas') {
          const hasStory = completedActivities.has('story-questions') || completedActivities.has('story-question');
          const hasSliderOrTriangle = completedActivities.has('slider-questions') || completedActivities.has('triangle-questions');
          const hasParticipant = completedActivities.has('participant-questions');
          return hasStory && hasSliderOrTriangle && hasParticipant;
        }

        // Special case for question-type activity
        if (activity.id === 'question-type') {
          return completedActivities.has('question-type');
        }

        // Special case for form-questions activity (can be slider OR triangle)
        if (activity.id === 'form-questions') {
          return completedActivities.has('slider-questions') || completedActivities.has('triangle-questions');
        }

        // Special case for form-languages (always complete by default)
        if (activity.id === 'form-languages-editor') {
          return true;
        }

        // Default case for other activities
        return completedActivities.has(activity.id) || 
               (activityData[activity.id] && Object.keys(activityData[activity.id]).length > 0);
      });

      if (allActivitiesComplete) {
        newCompletedSteps.add(step.id);
      }
    });

    setCompletedSteps(newCompletedSteps);
  }, [completedActivities, allSteps, isTemplateProject, activityData]);

  // Cache health monitoring - only check once per project
  const hasCheckedCache = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (activeProject?.id && !hasCheckedCache.current.has(activeProject.id)) {
      const diagnosis = diagnoseCacheHealth(activeProject.id);

      if (diagnosis.contaminatedEntries > 0) {
        debugLog(`⚠️ Found ${diagnosis.contaminatedEntries} contaminated cache entries`);
        cleanContaminatedCache(activeProject.id);
      }

      hasCheckedCache.current.add(activeProject.id);
    }
  }, [activeProject?.id]);

  // Redirect to projects page if no active project and not loading
  useEffect(() => {
    if (!activeProject && !isLoading) {
      navigate("/projects");
    }
  }, [activeProject, isLoading, navigate]);

  useForkSync({
    activeProject,
    allSteps,
    completedActivitiesSize: completedActivities.size,
    currentStepId,
    isCompletionLoading,
    setShowFork,
    setCurrentStepId,
    setSearchParams,
  });


  const handleStepSelect = (phaseId: string, stepId: string) => {
    setShowFork(false);
    const pid = activeProject?.id || getEffectiveProjectId(activeProject);
    persistForkChoice(pid, stepId);
    setSearchParams({ step: stepId });
    setSelectedActivity(null);
  };

  const handleForkSelect = (stepId: string) => {
    setShowFork(false);
    const step = allSteps.find(s => s.id === stepId);
    handleStepSelect(step?.phaseId || 'context', stepId);
  };

  const handleNext = () => {
    if (currentStepIndex < allSteps.length - 1) {
      setSearchParams({ step: allSteps[currentStepIndex + 1].id });
      setSelectedActivity(null);
    } else {
      // Last step - go to form
      navigate("/form");
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setSearchParams({ step: allSteps[currentStepIndex - 1].id });
      setSelectedActivity(null);
    }
  };

  const handleStartActivity = (activityId: string) => {
    setSelectedActivity(activityId);
  };

  const handleBackToStep = () => {
    setSelectedActivity(null);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-4rem)]">
        <ContentLoader />
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 h-[calc(100vh-4rem)]">
        <div className="bg-card border border-border/80 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 shadow-xs">
            <Compass className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-foreground [text-wrap:balance]">
              No Project Selected
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed [text-wrap:pretty]">
              Select an active project from the project directory to begin or continue the narrative design process.
            </p>
          </div>
          <Button
            onClick={() => navigate("/projects")}
            className="w-full active:scale-[0.98] transition-transform duration-150 shadow-xs"
          >
            Go to Projects
          </Button>
        </div>
      </div>
    );
  }

  // Find selected activity if any
  const selectedActivityData = selectedActivity
    ? currentStepData.activities.find(a => a.id === selectedActivity)
    : null;

  const readOnlyBanner = null;

  // If activity has a custom component, show it
  if (selectedActivityData?.component) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {readOnlyBanner}
        <div className="flex-1 overflow-auto">
          <CustomComponentView
            component={selectedActivityData.component}
            phaseId={currentStepData.phaseId}
          />
        </div>
      </div>
    );
  }

  // If activity is selected but no custom component, show activity view
  if (selectedActivity && selectedActivityData) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {readOnlyBanner}
        <div className="flex-1 overflow-auto">
          <ActivityView
            phaseId={currentStepData.phaseId}
            stepId={currentStepId}
            activity={selectedActivityData}
            onBackToActivities={handleBackToStep}
            onActivitySaved={(id) => void handleActivitySaved(id)}
          />
        </div>
      </div>
    );
  }

  // Main sidebar layout
  return (
    <div className="flex flex-col md:h-[calc(100vh-4rem)]">
      {readOnlyBanner}
      <div className="block md:flex flex-col md:flex-row min-h-full md:h-full flex-1 overflow-hidden">
      {/* Mobile Navigation Bar - Visible only on mobile */}
      <div className="md:hidden sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-md p-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-primary/10 p-2 rounded-lg text-primary border border-primary/20 shrink-0">
            {currentStepData.phaseId && designPhases.find(p => p.id === currentStepData.phaseId)?.icon}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wide truncate">
              {isDeterminingFork ? "Design Process" : showFork ? "Design Process" : currentStageTitle}
            </span>
            <span className="text-xs sm:text-sm font-semibold truncate text-foreground">
              {isDeterminingFork ? "Loading..." : showFork ? "Choose Your Path" : currentStepData.title}
            </span>
          </div>
        </div>

        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 text-foreground active:scale-95 transition-transform duration-150 h-9 w-9 shadow-xs" aria-label="Open menu">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[300px]">
            <SheetTitle className="sr-only">Design Navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Navigation menu for the design process steps
            </SheetDescription>
            <DesignSidebar
              currentStepId={currentStepId}
              onStepSelect={handleStepSelect}
              completedSteps={completedSteps}
              projectId={activeProject?.id}
              className="w-full border-none"
              onClose={() => setIsMobileMenuOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:block h-full border-r border-border shrink-0 z-40">
        <DesignSidebar
          currentStepId={currentStepId}
          onStepSelect={handleStepSelect}
          completedSteps={completedSteps}
          projectId={activeProject?.id}
        />
      </div>

      {isDeterminingFork ? (
        <div className="flex-1 flex items-center justify-center h-full">
          <ContentLoader />
        </div>
      ) : showFork ? (
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <DesignHero
              onSelectPath={handleForkSelect}
              projectId={activeProject?.id || effectiveProjectId || undefined}
            />
          </div>
        </div>
      ) : currentStepId === 'form-builder' ? (
        <div className="flex-1 h-full overflow-hidden">
          <FormBuilderStudio projectId={activeProject?.id} />
        </div>
      ) : (
        <DesignMainContent
          projectId={activeProject?.id}
          currentStep={currentStepData}
          phaseId={currentStepData.phaseId}
          phaseTitle={currentStepData.phaseTitle}
          stageTitle={currentStageTitle}
          stageStepNumber={currentStageStepNumber}
          stageTotalSteps={currentStageTotalSteps}
          activityData={activityData}
          onStartActivity={handleStartActivity}
          onPrevious={handlePrevious}
          onNext={handleNext}
          hasPrevious={currentStepIndex > 0}
          hasNext={currentStepIndex < allSteps.length - 1 || currentStepIndex === allSteps.length - 1}
          isLastStep={currentStepIndex === allSteps.length - 1}
          stepNumber={currentStepIndex + 1}
          totalSteps={allSteps.length}
          isTemplateProject={isTemplateProject}
          completedActivities={completedActivities}
          onActivitySaved={(id) => void handleActivitySaved(id)}
        />
      )}
    </div>
    </div>
  );
};

export default Design;
