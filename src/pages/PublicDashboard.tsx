import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PageLayout from "@/components/layout/PageLayout";
import StatsSection from "@/components/dashboard/StatsSection";
import { Project } from "@/types/project";
import { Story } from "@/types/story";
import { sentimentService } from "@/services/sentimentService";
import { isValidSentiment, determineEmotionLocally } from "@/utils/sentiment/emotionClassifier";
import { cleanStoryText } from "@/utils/story/formattingUtils";
import { debugLog, debugError } from "@/utils/debugLogger";
import { SectionLoader } from "@/components/ui/SectionLoader";
import { SavedComparisonsDrawer } from "@/components/dashboard/comparisons/SavedComparisonsDrawer";
import { useComparisonRehydration } from "@/hooks/comparisons/useComparisonRehydration";
import { SavedComparisonRow } from "@/hooks/comparisons/useSavedComparisons";
import { parseFormConfigRows, type ActivityResponseRow } from "@/services/publicFormService";
import { formDataQueryKey, toFormDataState } from "@/hooks/queries/useFormDataQuery";

import { getNonSecretShareId } from "@/hooks/queries/useSentimentEnrichmentQuery";

// Lazy load heavy sections
const SliderInsightsSection = lazy(() => import("@/components/dashboard/SliderInsightsSection"));
const ChartsSection = lazy(() => import("@/components/dashboard/ChartsSection"));
const SliderComparisonChart = lazy(() => import("@/components/dashboard/SliderComparisonChart"));
const WordCloudSection = lazy(() => import("@/components/dashboard/WordCloudSection"));
const TriangleInsightsSection = lazy(() => import("@/components/dashboard/triangle/TriangleInsightsSection"));

const PublicDashboard = () => {
  const queryClient = useQueryClient();
  const { token } = useParams<{ token: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [questionType, setQuestionType] = useState<string | null>(null);
  const [customBranding, setCustomBranding] = useState<{ text?: string }>({});
  const [savedComparisons, setSavedComparisons] = useState<SavedComparisonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [invalidToken, setInvalidToken] = useState(false);
  const [searchParams] = useSearchParams();

  const loadComparisonId = searchParams.get('loadComparison');
  const loadTimestamp = searchParams.get('t');
  
  const preFetchedComparison = useMemo(() => {
    if (!loadComparisonId || !savedComparisons.length) return null;
    return savedComparisons.find(c => c.id === loadComparisonId) || null;
  }, [loadComparisonId, savedComparisons]);

  const { rehydrated } = useComparisonRehydration(loadComparisonId, stories, preFetchedComparison);

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

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setInvalidToken(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        debugLog("Fetching public dashboard data for token:", token);

        const { data, error } = await supabase
          .rpc('get_public_dashboard_data', { token_value: token });

        if (error) {
          debugError("Error fetching public dashboard data:", error);
          setInvalidToken(true);
        } else if (data) {
          // Parse the JSON response
          // The RPC returns { project, stories, questionType }
          // The RPC returns { project, stories, questionType }
          interface PublicObservationRow {
            question_id: string;
            observation_text?: string | null;
            hypothesis_text?: string | null;
            observations?: unknown;
            hypotheses?: unknown;
          }
          interface DashboardData {
            project: Project;
            stories: Story[];
            questionType: string;
            customBranding?: { text?: string };
            savedComparisons?: SavedComparisonRow[];
            formConfig?: ActivityResponseRow[];
            observations?: PublicObservationRow[];
          }
          const result = data as unknown as DashboardData;

          if (!result.project) {
            setInvalidToken(true);
          } else {
            queryClient.setQueryData(
              ['publicObservations', result.project.id],
              Array.isArray(result.observations) ? result.observations : []
            );
            if (Array.isArray(result.formConfig) && result.formConfig.length > 0) {
              const parsedForm = await parseFormConfigRows(result.formConfig, result.project.id);
              if (parsedForm) {
                queryClient.setQueryData(
                  formDataQueryKey(result.project.id, true),
                  toFormDataState(parsedForm)
                );
              }
            }
            setProject(result.project as Project);

            // Process stories to ensure base stories with local provisional sentiment render immediately
            const rawStories = (result.stories || []) as Story[];
            const uniqueEmotions = new Set<string>();

            const initialStories: Story[] = rawStories.map(story => {
              const hasPersistedSentiment = isValidSentiment(story.feelingSentiment);
              let feelingSentiment = hasPersistedSentiment ? story.feelingSentiment : undefined;

              if (!hasPersistedSentiment && story.feeling && story.feeling !== "unspecified") {
                const local = determineEmotionLocally(story.feeling);
                if (local !== "unknown") {
                  feelingSentiment = local;
                }
                uniqueEmotions.add(story.feeling);
              }

              return {
                ...story,
                text: cleanStoryText(story.text, story.title, story.additional_comments),
                feelingSentiment,
                hasPersistedSentiment,
              };
            });

            // Set stories immediately so dashboard renders without awaiting Edge Function
            setStories(initialStories);
            setQuestionType(result.questionType);
            setCustomBranding(result.customBranding || {});
            setSavedComparisons(result.savedComparisons || []);

            // Background enrichment using authorized public access (non-blocking)
            if (uniqueEmotions.size > 0 && result.project?.id) {
              const currentProjectId = result.project.id;
              debugLog(`PublicDashboard - Background processing ${uniqueEmotions.size} unique emotions`);
              const publicShareId = getNonSecretShareId(token);
              sentimentService
                .getBatchSentiments(Array.from(uniqueEmotions), {
                  projectId: currentProjectId,
                  accessScope: 'public',
                  scopeIdentity: publicShareId,
                  dashboardToken: token,
                })
                .then(sentimentMap => {
                  if (sentimentMap.size === 0) return;
                  setStories(prevStories =>
                    prevStories.map(story => {
                      // Persisted sentiment takes strict precedence
                      if (story.hasPersistedSentiment) return story;
                      if (story.feeling && sentimentMap.has(story.feeling)) {
                        const canonical = sentimentMap.get(story.feeling);
                        if (canonical && canonical !== story.feelingSentiment) {
                          return {
                            ...story,
                            feelingSentiment: canonical,
                          };
                        }
                      }
                      return story;
                    })
                  );
                })
                .catch(err => {
                  debugError("PublicDashboard - Background sentiment analysis error (non-fatal):", err);
                });
            }

            debugLog("Loaded dashboard data:", {
              project: result.project?.name,
              storiesCount: initialStories.length,
              questionType: result.questionType
            });
          }
        } else {
          setInvalidToken(true);
        }
      } catch (error) {
        debugError("Unexpected error loading dashboard:", error);
        setInvalidToken(true);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [token, queryClient]);

  const { totalStories, positiveStories, neutralStories, negativeStories, feelingData } = useMemo(() => {
    let positiveStories = 0;
    let neutralStories = 0;
    let negativeStories = 0;
    const totalStories = stories.length;

    for (const s of stories) {
      if (s.feelingSentiment === "positive") positiveStories++;
      else if (s.feelingSentiment === "neutral") neutralStories++;
      else if (s.feelingSentiment === "negative") negativeStories++;
    }

    const feelingData = [
      { name: "Positive", value: positiveStories },
      { name: "Neutral", value: neutralStories },
      { name: "Negative", value: negativeStories },
    ].filter(item => item.value > 0);

    return { totalStories, positiveStories, neutralStories, negativeStories, feelingData };
  }, [stories]);

  if (loading) {
    return (
      <PageLayout simplified>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
          <span className="text-primary">Loading dashboard...</span>
        </div>
      </PageLayout>
    );
  }

  if (invalidToken || !project) {
    return (
      <PageLayout simplified>
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Invalid or Expired Link</h1>
          <p className="text-gray-600">This dashboard link is invalid or has been revoked.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout simplified customBranding={customBranding}>
      <div className="container mx-auto py-12">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full inline-block mb-2">Public Dashboard</div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">Project Dashboard: {project.name}</h1>
              <p className="text-gray-600 max-w-3xl">
                Analyze patterns and insights from experiences collected for this project. This dashboard provides
                a high-level overview of collection efforts.
              </p>
            </div>
            {savedComparisons.length > 0 && (
              <div className="mt-4 sm:mt-0">
                <SavedComparisonsDrawer 
                  projectId={project.id} 
                  publicComparisons={savedComparisons} 
                  isPublic={true} 
                />
              </div>
            )}
          </div>
        </div>

        {stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <h2 className="text-xl font-medium mb-2">No Stories Available</h2>
            <p className="text-gray-500">There are no stories available for this project yet.</p>
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
                  stories={stories}
                  projectId={project.id}
                  isPublic={true}
                />
              </Suspense>

              <Suspense fallback={<SectionLoader />}>
                <WordCloudSection stories={stories} isLoading={false} />
              </Suspense>
            </div>

            {(() => {
              const showSliders = questionType 
                ? (questionType === 'slider' || questionType === 'both') 
                : (!questionType); // Public dashboard depends on data fetched by RPC which includes questionType
              
              const showTriangles = questionType 
                ? (questionType === 'triangle' || questionType === 'both') 
                : false; // Standard RPC fetches should have questionType if triangles were ever intended

              return (
                <>
                  {showSliders && (
                    <>
                      <div className="mb-8">
                        <Suspense fallback={<SectionLoader />}>
                          <SliderInsightsSection
                            stories={stories}
                            isLoading={false}
                            isPublic={true}
                            projectId={project.id}
                          />
                        </Suspense>
                      </div>

                      <div className="mb-8">
                        <Suspense fallback={<SectionLoader height="h-[600px]" />}>
                          <SliderComparisonChart 
                            stories={stories} 
                            projectId={project.id} 
                            isPublic={true} 
                            isActiveProject={Boolean(project?.is_active)} 
                            initialContext={rehydratedSliderContext}
                            driftNotice={rehydrated?.driftNotice}
                          />
                        </Suspense>
                      </div>
                    </>
                  )}

                  {showTriangles && (
                    <div className="mb-8">
                      <Suspense fallback={<SectionLoader height="h-[600px]" />}>
                        <TriangleInsightsSection
                          stories={stories}
                          isLoading={false}
                          isPublic={true}
                          projectId={project.id}
                          isActiveProject={Boolean(project?.is_active)}
                          initialContext={rehydratedTriangleContext}
                          driftNotice={rehydrated?.driftNotice}
                        />
                      </Suspense>
                    </div>
                  )}
                </>
              );
            })()}

          </>
        )}
      </div>
    </PageLayout>
  );
};

export default PublicDashboard;
