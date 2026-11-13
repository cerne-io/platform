import { useState, useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { debugError } from "@/utils/debugLogger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save } from "lucide-react";
import InsightList from "@/components/dashboard/shared/InsightList";
import debounce from "@/utils/debounce";

interface ObservationRow {
  question_id?: string;
  observation_text?: string | null;
  hypothesis_text?: string | null;
  observations?: unknown;
  hypotheses?: unknown;
}

interface DashboardObservationsCardProps {
  projectId: string;
  questionKey: string;
  layout?: 'stacked' | 'two-column';
  observationTooltip?: string;
  hypothesisTooltip?: string;
  className?: string;
  isPublic?: boolean;
}

const DEFAULT_OBS_TOOLTIP =
  "Look at the information in the graph and describe what you can observe, without interpretations.";
const DEFAULT_HYP_TOOLTIP =
  "What might the graph be telling you? What hypotheses can you create? Work to generate more than one hypothesis. It's ok if they contradict each other.";

const DashboardObservationsCard: React.FC<DashboardObservationsCardProps> = ({
  projectId,
  questionKey,
  layout = 'stacked',
  observationTooltip = DEFAULT_OBS_TOOLTIP,
  hypothesisTooltip = DEFAULT_HYP_TOOLTIP,
  className,
  isPublic = false,
}) => {
  const [observations, setObservations] = useState<string[]>([]);
  const [hypotheses, setHypotheses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    const applyRow = (data: ObservationRow | undefined) => {
      if (!data) {
        setObservations([]);
        setHypotheses([]);
        return;
      }

      let obs: string[] = [];
      if (data.observations && Array.isArray(data.observations)) {
        obs = data.observations.map(String);
      } else if (data.observation_text) {
        obs = [data.observation_text];
      }

      let hyp: string[] = [];
      if (data.hypotheses && Array.isArray(data.hypotheses)) {
        hyp = data.hypotheses.map(String);
      } else if (data.hypothesis_text) {
        hyp = [data.hypothesis_text];
      }

      setObservations(obs);
      setHypotheses(hyp);
    };

    const fetchData = async () => {
      if (isPublic) {
        const cached = queryClient.getQueryData<ObservationRow[]>(['publicObservations', projectId]);
        applyRow(cached?.find((item) => item.question_id === questionKey));
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('dashboard_observations')
          .select('observation_text, hypothesis_text, observations, hypotheses')
          .eq('project_id', projectId)
          .eq('question_id', questionKey)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;
        applyRow(data ?? undefined);
      } catch (error) {
        if (!cancelled) {
          debugError("Error fetching observations:", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (projectId && questionKey) {
      void fetchData();
    }

    return () => {
      cancelled = true;
    };
  }, [projectId, questionKey, isPublic, queryClient]);

  const saveData = async (
    targetProjectId: string,
    targetQuestionKey: string,
    obs: string[],
    hyp: string[]
  ) => {
    if (isPublic) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('dashboard_observations')
        .upsert({
          project_id: targetProjectId,
          question_id: targetQuestionKey,
          updated_at: new Date().toISOString(),
          observations: obs,
          hypotheses: hyp,
          observation_text: obs.length > 0 ? obs[0] : "",
          hypothesis_text: hyp.length > 0 ? hyp[0] : "",
        }, {
          onConflict: 'project_id,question_id'
        });

      if (error) throw error;
    } catch (error) {
      debugError("Error saving observations:", error);
      toast({
        title: "Error saving",
        description: "Failed to save your insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveDataRef = useRef(saveData);
  useEffect(() => {
    saveDataRef.current = saveData;
  });

  const debouncedSave = useMemo(
    () => debounce((targetProjectId: string, targetQuestionKey: string, obs: string[], hyp: string[]) => {
      void saveDataRef.current(targetProjectId, targetQuestionKey, obs, hyp);
    }, 1000),
    []
  );

  useEffect(() => {
    return () => {
      debouncedSave.flush();
    };
  }, [debouncedSave, projectId, questionKey]);

  const handleObservationsChange = (newItems: string[]) => {
    if (isPublic) return;
    setObservations(newItems);
    debouncedSave(projectId, questionKey, newItems, hypotheses);
  };

  const handleHypothesesChange = (newItems: string[]) => {
    if (isPublic) return;
    setHypotheses(newItems);
    debouncedSave(projectId, questionKey, observations, newItems);
  };

  if (loading) {
    return (
      <div className={`flex justify-center py-8 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className={`border border-border shadow-sm flex flex-col ${className}`}>
      <CardHeader className="py-3 px-4 bg-muted/30 flex-none">
        <CardTitle className="text-sm font-medium flex justify-between items-center">
          <span>Insights {isPublic && "(Read Only)"}</span>
          {!isPublic && (
            <>
              {saving && <span className="text-xs text-muted-foreground flex items-center"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Saving...</span>}
              {!saving && <span className="text-xs text-muted-foreground flex items-center"><Save className="h-3 w-3 mr-1" /> Saved</span>}
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent
        className={
          layout === 'two-column'
            ? "p-4 flex-1 grid grid-cols-1 md:grid-cols-2 gap-4"
            : "p-4 flex-1 flex flex-col gap-6 min-h-0"
        }
      >
        <div className={layout === 'two-column' ? "flex flex-col space-y-2 min-h-0" : undefined}>
          <InsightList
            title="Observations"
            items={observations}
            onItemsChange={handleObservationsChange}
            isPublic={isPublic}
            placeholder="Add an observation..."
            tooltipText={observationTooltip}
            idPrefix={`obs-${questionKey}`}
          />
        </div>

        <div className={layout === 'two-column' ? "flex flex-col space-y-2 min-h-0" : "border-t border-border pt-4"}>
          <InsightList
            title="Hypotheses"
            items={hypotheses}
            onItemsChange={handleHypothesesChange}
            isPublic={isPublic}
            placeholder="Add a hypothesis..."
            tooltipText={hypothesisTooltip}
            idPrefix={`hyp-${questionKey}`}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardObservationsCard;

