import React, { useMemo, lazy } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SentimentChartTab from "./SentimentChartTab";
import { Story } from "@/types/story";

import { useProject } from "@/contexts/ProjectContext";
import { useFormDataQuery } from "@/hooks/queries/useFormDataQuery";

const ParticipantResponsesTab = lazy(() => import("./ParticipantResponsesTab"));
interface ChartsSectionProps {
  feelingData: {
    name: string;
    value: number;
  }[];
  totalStories: number;
  stories: Story[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  projectId?: string;
  isPublic?: boolean;
}
const ChartsSection: React.FC<ChartsSectionProps> = ({
  feelingData,
  totalStories,
  stories,
  activeTab,
  onTabChange,
  projectId,
  isPublic = false
}) => {
  const { activeProject } = useProject();
  const effectiveProjectId = projectId || activeProject?.id;

  // Fetch form data to get the default language questions
  const { data: formData } = useFormDataQuery(effectiveProjectId, isPublic);
  const defaultParticipantQuestions = formData?.participantQuestions;

  const participantQuestions = useMemo(() => {
    if (stories.length === 0) return [];
    const questionsMap = new Map<string, string>();

    // Optimization: Build a Map for O(1) lookup to avoid O(N*M) time complexity from .find in nested loop
    const defaultQuestionsMap = new Map<string, string>();
    if (defaultParticipantQuestions) {
      defaultParticipantQuestions.forEach(q => {
        defaultQuestionsMap.set(q.id.toString(), q.label || "");
      });
    }

    stories.forEach(story => {
      if (story.participantResponses) {
        story.participantResponses.forEach(response => {
          if (response.question_id && response.question_text) {
            // Deduplicate by question_id to ensure unique React keys and Tab values
            if (!questionsMap.has(response.question_id)) {
              const defaultLabel = defaultQuestionsMap.get(response.question_id);
              questionsMap.set(response.question_id, defaultLabel || response.question_text);
            }
          }
        });
      }
    });

    // Convert map to array for rendering
    return Array.from(questionsMap.entries()).map(([id, text]) => ({
      id,
      question: text
    }));
  }, [stories, defaultParticipantQuestions]);
  const validTabs = new Set(['sentiment', ...participantQuestions.map(q => `question-${q.id}`)]);
  const resolvedTab = (activeTab && validTabs.has(activeTab)) ? activeTab : 'sentiment';

  return <div className="col-span-1 lg:col-span-2 h-full">
    <Tabs
      defaultValue="sentiment"
      value={resolvedTab}
      onValueChange={onTabChange}
      className="flex flex-col h-full"
    >
      <TabsList className="inline-flex h-9 items-center justify-start rounded-md bg-muted/40 border border-border/80 p-0.5 text-muted-foreground mb-4 gap-1 overflow-x-auto max-w-full" data-tour="dashboard-tabs">
        <TabsTrigger
          value="sentiment"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
          data-tour="dashboard-tab-sentiment"
        >
          Sentiment
        </TabsTrigger>

        {participantQuestions.map((question) => (
          <TabsTrigger
            key={question.id}
            value={`question-${question.id}`}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            data-tour="dashboard-tab-question"
          >
            {question.question.length > 20 ? `${question.question.substring(0, 20)}...` : question.question}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="h-[calc(100%-60px)]">
        <TabsContent value="sentiment" className="h-full mt-0">
          <SentimentChartTab feelingData={feelingData} totalStories={totalStories} />
        </TabsContent>

        {participantQuestions.map(question => <TabsContent key={`content-${question.id}`} value={`question-${question.id}`} className="h-full mt-0">
          <ParticipantResponsesTab stories={stories} questionText={question.question} totalStories={totalStories} />
        </TabsContent>)}
      </div>
    </Tabs>
  </div>;
};
export default ChartsSection;