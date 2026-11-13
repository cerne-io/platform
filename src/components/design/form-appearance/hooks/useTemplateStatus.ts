import { debugError } from "@/utils/debugLogger";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to determine if the project is a template and if it's in read-only mode
 */
export const useTemplateStatus = (projectId?: string) => {
  const [isTemplateProject, setIsTemplateProject] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const isAdmin = Boolean(useAuth().user);
  const { currentUserProjectRole } = useProject();

  useEffect(() => {
    const checkTemplateStatus = async () => {
      if (!projectId) return;

      setIsChecking(true);
      try {
        // First check if this project has a public form ID
        const { data: hasPublicForm, error: publicFormError } = await supabase
          .rpc('has_public_form_id', { project_id: projectId });

        if (!publicFormError && hasPublicForm) {
          setIsTemplateProject(false); // Has public form = not a template
          setIsChecking(false);
          return;
        }

        const { data, error } = await supabase
          .from('projects')
          .select('is_template')
          .eq('id', projectId)
          .maybeSingle();

        if (error) {
          debugError("Error checking template status:", error);
          return;
        }

        setIsTemplateProject(data?.is_template || false);
      } catch (err) {
        debugError("Error in template status check:", err);
      } finally {
        setIsChecking(false);
      }
    };

    void checkTemplateStatus();
  }, [projectId]);

  const isReadOnly = (isTemplateProject && !isAdmin) || currentUserProjectRole === 'viewer';
  const canSaveChanges = !isReadOnly;

  return {
    isTemplateProject,
    isReadOnly,
    canSaveChanges,
    isChecking
  };
};
