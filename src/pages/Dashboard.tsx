import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, BarChart3, Share2, Sparkles } from "lucide-react";
import PageContentErrorBoundary from "@/components/layout/PageContentErrorBoundary";
import { useProject } from "@/contexts/ProjectContext";
import { useStoriesQuery } from "@/hooks/queries/useStoriesQuery";
import { useFormDataQuery } from "@/hooks/queries/useFormDataQuery";
import StatsSection from "@/components/dashboard/StatsSection";
import ShareDashboardSection from "@/components/dashboard/ShareDashboardSection";
import { ErrorDisplay } from "@/components/ui/error-display";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import useFeedback from "@/hooks/useFeedback";
import { debugLog } from "@/utils/debugLogger";
import { SectionLoader } from "@/components/ui/SectionLoader";
import { SavedComparisonsDrawer } from "@/components/dashboard/comparisons/SavedComparisonsDrawer";
import { useComparisonRehydration } from "@/hooks/comparisons/useComparisonRehydration";

// Lazy load heavy sections
const SliderInsightsSection = lazy(() => import("@/components/dashboard/SliderInsightsSection"));
const ChartsSection = lazy(() => import("@/components/dashboard/ChartsSection"));
const SliderComparisonChart = lazy(() => import("@/components/dashboard/SliderComparisonChart"));
const WordCloudSection = lazy(() => import("@/components/dashboard/WordCloudSection"));
const TriangleInsightsSection = lazy(() => import("@/components/dashboard/triangle/TriangleInsightsSection"));

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'sentiment';

  const handleTabChange = (val: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', val);
      return newParams;
    });
  };

  const {
    activeProject
  } = useProject();

  const {
    data: stories = [],
    isLoading,
    refetch,
    error: storiesError
  } = useStoriesQuery();

  const { data: formData, isLoading: isFormDataLoading } = useFormDataQuery(activeProject?.id);

  // Filter out transitional stories from prior project during project switch
  const currentStories = useMemo(() => {
    if (!activeProject?.id) return stories;
    return stories.filter(s => !s.project_id || s.project_id === activeProject.id);
  }, [stories, activeProject?.id]);

  // Detect presence of responses directly in current-project stories for instant layout determination
  const hasTriangleResponsesInStories = useMemo(() =>
    currentStories.some(s => s.triangleResponses && s.triangleResponses.length > 0),
    [currentStories]
  );
  const hasSliderResponsesInStories = useMemo(() =>
    currentStories.some(s => s.sliderResponses && s.sliderResponses.length > 0),
    [currentStories]
  );

  // Robust decision logic for section visibility
  const { showSliders, showTriangles, isQuestionSectionLoading } = useMemo(() => {
    // 1. If form configuration is loaded, prioritize explicit config:
    if (formData) {
      const qType = formData.questionType;
      const hasSliderConfig = Boolean(formData.sliderQuestions && formData.sliderQuestions.length > 0);
      const hasTriangleConfig = Boolean(formData.triangleQuestions && formData.triangleQuestions.length > 0);

      if (qType === 'triangle') {
        return { showSliders: false, showTriangles: true, isQuestionSectionLoading: false };
      }
      if (qType === 'slider') {
        return { showSliders: true, showTriangles: false, isQuestionSectionLoading: false };
      }
      if (qType === 'both') {
        return { showSliders: true, showTriangles: true, isQuestionSectionLoading: false };
      }

      // Backward compatibility / unconfigured questionType in DB:
      const hasSliders = hasSliderConfig || hasSliderResponsesInStories;
      const hasTriangles = hasTriangleConfig || hasTriangleResponsesInStories;

      return {
        showSliders: hasSliders || (!hasSliders && !hasTriangles),
        showTriangles: hasTriangles,
        isQuestionSectionLoading: false
      };
    }

    // 2. While formData is still loading:
    // If stories already definitively indicate triangle responses and no slider responses,
    // render triangles immediately to avoid layout shift.
    if (hasTriangleResponsesInStories && !hasSliderResponsesInStories) {
      return { showSliders: false, showTriangles: true, isQuestionSectionLoading: false };
    }
    if (hasSliderResponsesInStories && !hasTriangleResponsesInStories) {
      return { showSliders: true, showTriangles: false, isQuestionSectionLoading: false };
    }
    if (hasSliderResponsesInStories && hasTriangleResponsesInStories) {
      return { showSliders: true, showTriangles: true, isQuestionSectionLoading: false };
    }

    // 3. Neither question type is confirmed yet (e.g. 0 stories or pending fetch):
    // Show a clean loader instead of prematurely mounting blank slider components.
    return {
      showSliders: false,
      showTriangles: false,
      isQuestionSectionLoading: isFormDataLoading
    };
  }, [formData, isFormDataLoading, hasTriangleResponsesInStories, hasSliderResponsesInStories]);

  // Use the feedback hook
  const { showSuccess, showError } = useFeedback("Dashboard");

  // Track any load errors
  const [loadError, setLoadError] = useState<Error | null>(null);

  // Track dashboard loading state
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  // Track data recency for subtle live status
  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());
  const [relativeTime, setRelativeTime] = useState<string>("Updated just now");

  useEffect(() => {
    if (!isLoading && currentStories) {
      setLastUpdated(new Date());
    }
  }, [currentStories, isLoading]);

  useEffect(() => {
    const updateRelativeTime = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      const diffSec = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (diffSec < 30) {
        setRelativeTime("Updated just now");
      } else if (diffSec < 60) {
        setRelativeTime("Updated < 1m ago");
      } else {
        const mins = Math.floor(diffSec / 60);
        setRelativeTime(`Updated ${mins}m ago`);
      }
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 10000);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", updateRelativeTime);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", updateRelativeTime);
      }
    };
  }, [lastUpdated]);

  // Track successful data load
  const hasShownSuccessToast = useRef<string | null>(null);

  const loadComparisonId = searchParams.get('loadComparison');
  const loadTimestamp = searchParams.get('t');
  const { rehydrated } = useComparisonRehydration(loadComparisonId, currentStories);

  // Expose the rehydrated state as initial state for the charts
  const rehydratedTriangleContext = useMemo(() => {
    if (rehydrated?.analysisType === 'triangle' && rehydrated.context) {
      return { ...rehydrated.context, openedAt: loadTimestamp ? parseInt(loadTimestamp, 10) : undefined };
    }
    return null;
  }, [rehydrated, loadTimestamp]);

  const rehydratedSliderContext = useMemo(() => {
    if (rehydrated?.analysisType === 'slider' && rehydrated.context) {
      return { ...rehydrated.context, openedAt: loadTimestamp ? parseInt(loadTimestamp, 10) : undefined };
    }
    return null;
  }, [rehydrated, loadTimestamp]);
  
  const rehydratedDriftNotice = rehydrated?.driftNotice;

  useEffect(() => {
    debugLog("Dashboard rendering with:", {
      storiesCount: currentStories.length,
      isLoading,
      projectName: activeProject?.name,
      hasError: !!loadError,
      hasShownToastFor: hasShownSuccessToast.current
    });

    // Reset error state when project changes
    if (activeProject) {
      setLoadError(null);

      // Show feedback when data is loaded successfully
      // Only show once per project by tracking the project ID
      if (currentStories.length > 10 && !isLoading && hasShownSuccessToast.current !== activeProject.id) {
        hasShownSuccessToast.current = activeProject.id;
        showSuccess(`${currentStories.length} stories loaded successfully`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject, currentStories.length, isLoading, loadError]);

  // Handle manual refresh with feedback
  const handleManualRefresh = async () => {
    try {
      setIsDashboardLoading(true);
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ['formData', activeProject?.id] })
      ]);
      setLastUpdated(new Date());
      showSuccess("Dashboard data refreshed successfully");
    } catch (error) {
      showError(error, "Failed to refresh dashboard data");
      setLoadError(error instanceof Error ? error : new Error("Unknown error occurred"));
    } finally {
      setIsDashboardLoading(false);
    }
  };

  // Calculate stats from stories
  // ⚡ Bolt: Memoized these calculations to prevent expensive re-computations on every render.
  // This reduces the overhead when other state changes (like isLoading or tabs).
  const {
    totalStories,
    positiveStories,
    neutralStories,
    negativeStories,
    feelingData,
  } = useMemo(() => {
    let positiveStories = 0;
    let neutralStories = 0;
    let negativeStories = 0;
    const totalStories = currentStories.length;

    // Single pass for stats
    for (const s of currentStories) {
      if (s.feelingSentiment === "positive") positiveStories++;
      else if (s.feelingSentiment === "neutral") neutralStories++;
      else if (s.feelingSentiment === "negative") negativeStories++;
    }

    const feelingData = [
      { name: "Positive", value: positiveStories },
      { name: "Neutral", value: neutralStories },
      { name: "Negative", value: negativeStories },
    ].filter((item) => item.value > 0);

    return {
      totalStories,
      positiveStories,
      neutralStories,
      negativeStories,
      feelingData,
    };
  }, [currentStories]);

  if (!activeProject) {
    return (
      <PageContentErrorBoundary>
        <div className="container mx-auto py-12">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">No Active Project</h1>
            <p className="text-gray-600">
              Please select or create a project to view dashboard analytics.
            </p>
          </div>
        </div>
      </PageContentErrorBoundary>
    );
  }

  // Show error display if we couldn't load stories
  if (loadError || storiesError) {
    const error = loadError || storiesError;
    return (
      <PageContentErrorBoundary>
        <div className="container mx-auto py-12">
          <ErrorDisplay
            severity="error"
            title="Dashboard Error"
            message="There was a problem loading your dashboard data."
            error={error}
            componentName="Dashboard"
            onRetry={() => void handleManualRefresh()}
            action={
              <Button
                onClick={() => void handleManualRefresh()}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
                disabled={isDashboardLoading}
              >
                {isDashboardLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </>
                )}
              </Button>
            }
          />
        </div>
      </PageContentErrorBoundary>
    );
  }

  return (
    <PageContentErrorBoundary>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-8">
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-foreground [text-wrap:balance]">
                Project Dashboard: {activeProject?.name}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed [text-wrap:pretty]">
                Analyze patterns and insights from experiences collected for this project. This dashboard provides
                a high-level overview of your collection efforts.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => void handleManualRefresh()}
                      variant="outline"
                      size="sm"
                      disabled={isLoading || isDashboardLoading}
                      className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg flex items-center gap-2 border-border/80 transition-all active:scale-95"
                      aria-label="Refresh dashboard data"
                    >
                      <span className="relative flex h-2 w-2">
                        <span
                          className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                            isLoading || isDashboardLoading
                              ? "bg-amber-400 animate-ping"
                              : "bg-emerald-400"
                          }`}
                        />
                        <span
                          className={`relative inline-flex rounded-full h-2 w-2 ${
                            isLoading || isDashboardLoading
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                        />
                      </span>
                      <span className="font-medium text-foreground/80">
                        {isLoading || isDashboardLoading ? "Syncing..." : relativeTime}
                      </span>
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${
                          isLoading || isDashboardLoading
                            ? "animate-spin text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-xs">
                    Auto-updates every 2m. Click to sync stories and form configuration now.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <SavedComparisonsDrawer />
            </div>
          </div>
        </div>

        {isLoading || isDashboardLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
            <span className="text-primary font-medium">Loading project data...</span>
          </div>
        ) : currentStories.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-8 sm:p-12 max-w-lg mx-auto text-center space-y-6 my-8">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">No Stories Collected Yet</h3>
              <p className="text-sm text-muted-foreground leading-relaxed [text-wrap:balance]">
                Your project is ready to receive narratives. Collect stories to generate live sentiment maps, cluster analysis, and participant patterns.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Button asChild className="w-full sm:w-auto h-10 px-5">
                <Link to="/collect" className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Collect Stories
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto h-10 px-5">
                <Link to="/design" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Review Questions
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <StatsSection
              totalStories={totalStories}
              positiveStories={positiveStories}
              neutralStories={neutralStories}
              negativeStories={negativeStories}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <Suspense fallback={<SectionLoader className="lg:col-span-2" />}>
                <ChartsSection
                  feelingData={feelingData}
                  totalStories={totalStories}
                  stories={currentStories}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                />
              </Suspense>

              <Suspense fallback={<SectionLoader />}>
                <WordCloudSection stories={currentStories} isLoading={isLoading} />
              </Suspense>
            </div>

            {isQuestionSectionLoading && (
              <div className="mb-8">
                <SectionLoader height="h-[400px]" />
              </div>
            )}

            {showSliders && (
              <>
                <div className="mb-8">
                  <Suspense fallback={<SectionLoader />}>
                    <SliderInsightsSection 
                      stories={currentStories} 
                      isLoading={isLoading} 
                      projectId={activeProject?.id}
                    />
                  </Suspense>
                </div>

                <div className="mb-8">
                  <Suspense fallback={<SectionLoader height="h-[600px]" />}>
                    <SliderComparisonChart 
                      stories={currentStories} 
                      projectId={activeProject.id}
                      initialContext={rehydratedSliderContext}
                      driftNotice={rehydratedSliderContext ? rehydratedDriftNotice : undefined}
                    />
                  </Suspense>
                </div>
              </>
            )}

            {showTriangles && (
              <div className="mb-8">
                <Suspense fallback={<SectionLoader height="h-[600px]" />}>
                  <TriangleInsightsSection 
                    stories={currentStories} 
                    isLoading={isLoading} 
                    initialContext={rehydratedTriangleContext}
                    driftNotice={rehydratedTriangleContext ? rehydratedDriftNotice : undefined}
                  />
                </Suspense>
              </div>
            )}

            <ShareDashboardSection projectId={activeProject.id} projectName={activeProject.name} />
          </>
        )}
      </div>
    </PageContentErrorBoundary>
  );
};

export default Dashboard;
