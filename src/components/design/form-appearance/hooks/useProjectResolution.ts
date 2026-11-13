import { debugError } from "@/utils/debugLogger";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { debugLog } from "@/utils/debugLogger";

/**
 * Hook to check project resolution status and gather debug info
 */
export interface ProjectResolutionDebugInfo {
  project: {
    id: string;
    name: string;
    verified: boolean;
  };
  authentication: {
    status?: boolean;
    checked: boolean;
  };
  query: {
    searchPaths: string[];
    debugResults: Array<{
      path: string;
      found: boolean;
      error: string | null;
      data: unknown;
      timestamp?: string | null;
    }>;
    foundAt: string | null;
  };
  currentRoute: string;
}

export const useProjectResolution = (projectId?: string, isAuthenticated?: boolean) => {
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<ProjectResolutionDebugInfo | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (!projectId) return;

    setIsResolving(true);
    setResolutionError(null);

    const checkProject = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name')
          .eq('id', projectId)
          .single();

        if (error) {
          debugError("Error verifying project access:", error);
          setResolutionError(`Project access error: ${error.message}`);
        } else if (data) {
          debugLog("Project verified accessible:", data);

          const debugResults = {
            project: {
              id: projectId,
              name: data.name,
              verified: !!data
            },
            authentication: {
              status: isAuthenticated,
              checked: isAuthenticated !== undefined
            },
            query: {
              searchPaths: [
                'build/form-appearance/form-appearance-editor'
              ],
              debugResults: [] as Array<{
                path: string;
                found: boolean;
                error: string | null;
                data: unknown;
                timestamp?: string | null;
              }>,
              foundAt: null as string | null
            },
            currentRoute: location.pathname
          };

          for (const path of debugResults.query.searchPaths) {
            const [phase, step, activity] = path.split('/');

            try {
              const { data: pathData, error: pathError } = await supabase
                .from('activity_responses')
                .select('ar_response, id, updated_at')
                .eq('ar_project_id', projectId)
                .eq('ar_phase_id', phase)
                .eq('ar_step_id', step)
                .eq('ar_activity_id', activity)
                .maybeSingle();

              debugResults.query.debugResults.push({
                path,
                found: !!pathData,
                error: pathError ? pathError.message : null,
                data: pathData?.ar_response || null,
                timestamp: pathData?.updated_at || null
              });

              if (pathData) {
                debugResults.query.foundAt = path;
              }
            } catch (err) {
              debugResults.query.debugResults.push({
                path,
                found: false,
                error: err instanceof Error ? err.message : 'Unknown error',
                data: null
              });
            }
          }

          setDebugInfo(debugResults);
        } else {
          setResolutionError("Project not found");
        }
      } catch (err) {
        debugError("Error in project verification:", err);
        setResolutionError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsResolving(false);
      }
    };

    void checkProject();
  }, [projectId, isAuthenticated, location.pathname]);

  return {
    isResolving,
    resolutionError,
    debugInfo
  };
};
