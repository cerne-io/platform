
import { useState, useCallback, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { getPublicFormBaseUrl } from "@/utils/urlUtils";
import { debugLog, debugError } from "@/utils/debugLogger";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchExistingFormIdentifier,
  createOrUpdateFormIdentifier,
  revokeFormIdentifier,
  updateFormSchedule
} from "./form-save/formIdentifiers";
import { projectsQueryKey } from "../queries/useProjectsQuery";

export const useFormLink = () => {
  const [copied, setCopied] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const { toast } = useToast();
  const { activeProject, setActiveProject } = useProject();
  const queryClient = useQueryClient();

  const projectId = activeProject?.id;

  // Query for fetching form identifier
  const { data: formIdData } = useQuery({
    queryKey: ['formIdentifier', projectId],
    queryFn: () => projectId ? fetchExistingFormIdentifier(projectId) : null,
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const formId = formIdData?.form_id || null;
  const startDate = formIdData?.start_date ? new Date(formIdData.start_date) : null;
  const endDate = formIdData?.end_date ? new Date(formIdData.end_date) : null;

  // Helper to invalidate all relevant project related queries
  const invalidateProjectQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    void queryClient.invalidateQueries({ queryKey: ['formIdentifier', projectId] });
  }, [queryClient, projectId]);

  // Mutation for generating/updating form ID
  const generateMutation = useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate?: Date | null, endDate?: Date | null }) => {
      if (!projectId) throw new Error("No project ID");
      return createOrUpdateFormIdentifier(projectId, startDate, endDate);
    },
    onSuccess: (newFormId) => {
      invalidateProjectQueries();

      // Also update local active project state for immediate consistency
      if (activeProject) {
        setActiveProject({
          ...activeProject,
          has_active_link: true
        });
      }

      debugLog("useFormLink - Created/Updated form ID:", newFormId);
    },
    onError: (error) => {
      debugError("Error generating form ID:", error);
      toast({
        title: "Error",
        description: "Failed to generate link.",
        variant: "destructive"
      });
    }
  });

  // Mutation for updating schedule
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate?: Date | null, endDate?: Date | null }) => {
      if (!projectId) throw new Error("No project ID");
      return updateFormSchedule(projectId, startDate, endDate);
    },
    onSuccess: () => {
      invalidateProjectQueries();
      toast({
        title: "Schedule updated",
        description: "Form availability schedule has been updated.",
      });
    },
    onError: (error) => {
      debugError("Error updating schedule:", error);
      toast({
        title: "Error",
        description: "Failed to update form schedule.",
        variant: "destructive"
      });
    }
  });

  // Mutation for revoking link
  const revokeMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project ID");
      return revokeFormIdentifier(projectId);
    },
    onSuccess: (success) => {
      if (success) {
        invalidateProjectQueries();

        // Also update local active project state for immediate consistency
        if (activeProject) {
          setActiveProject({
            ...activeProject,
            has_active_link: false
          });
        }

        toast({
          title: "Link revoked",
          description: "The public submission link has been revoked and is no longer accessible.",
        });
      } else {
        throw new Error("Failed to revoke");
      }
    },
    onError: (error) => {
      debugError("Error revoking form link:", error);
      toast({
        title: "Error",
        description: "Failed to revoke the public link. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleUpdateSchedule = useCallback(async (newStartDate?: Date | null, newEndDate?: Date | null) => {
    if (!projectId) return false;
    try {
      await updateScheduleMutation.mutateAsync({ startDate: newStartDate, endDate: newEndDate });
      return true;
    } catch {
      return false;
    }
  }, [projectId, updateScheduleMutation]);

  const ensureFormIdExists = useCallback(async (newStartDate?: Date | null, newEndDate?: Date | null) => {
    if (!projectId) return null;

    if (formId) {
      if (newStartDate !== undefined || newEndDate !== undefined) {
        await handleUpdateSchedule(newStartDate, newEndDate);
      }
      return formId;
    }

    try {
      const newId = await generateMutation.mutateAsync({ startDate: newStartDate, endDate: newEndDate });
      return newId;
    } catch {
      return null;
    }
  }, [projectId, formId, handleUpdateSchedule, generateMutation]);

  const getPublicLink = useCallback(async () => {
    if (!projectId) return null;
    const linkFormId = formId || await ensureFormIdExists();
    if (!linkFormId) return null;
    return `${getPublicFormBaseUrl()}/submit-story/${linkFormId}`;
  }, [projectId, formId, ensureFormIdExists]);

  const handleCopyLink = useCallback(async () => {
    const publicLink = await getPublicLink();
    if (!publicLink) {
      toast({
        title: "Error",
        description: "Could not generate public link. Please try again.",
        variant: "destructive"
      });
      return;
    }

    void navigator.clipboard.writeText(publicLink);
    setCopied(true);
    toast({
      title: "Link copied",
      description: "The public submission link has been copied to your clipboard.",
    });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, [getPublicLink, toast]);

  const handleOpenInNewTab = useCallback(async () => {
    const publicLink = await getPublicLink();
    if (!publicLink) {
      toast({
        title: "Error",
        description: "Could not generate public link. Please try again.",
        variant: "destructive"
      });
      return;
    }
    window.open(publicLink, '_blank');
  }, [getPublicLink, toast]);

  const handleRevokeLink = useCallback(async () => {
    if (!projectId) return;
    await revokeMutation.mutateAsync();
  }, [projectId, revokeMutation]);

  return {
    copied,
    formId,
    startDate,
    endDate,
    isGenerating: generateMutation.isPending,
    isRevoking: revokeMutation.isPending,
    isUpdatingSchedule: updateScheduleMutation.isPending,
    handleCopyLink,
    handleOpenInNewTab,
    handleRevokeLink,
    ensureFormIdExists,
    handleUpdateSchedule
  };
};
