import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabasePublic } from "@/integrations/supabase/publicClient";
import { debugLog, debugError } from "@/utils/debugLogger";
/**
 * Hook to resolve a form ID to a project ID
 * @param isPublic Whether this is for a public form
 * @param formId The form identifier to resolve
 * @returns Object with resolved projectId, loading state, and error
 */
export const useProjectIdResolver = (isPublic: boolean, formId?: string | null) => {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const resolveFormId = async () => {
      if (!formId) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        debugLog("Resolving form ID to project ID:", formId, "isPublic:", isPublic);

        // Use public client for public forms, authenticated client for private forms
        const client = isPublic ? supabasePublic : supabase;
        debugLog("🔵 Using client:", isPublic ? "supabasePublic (unauthenticated)" : "supabase (authenticated)");

        // Call the RPC function to get the project ID from the form ID
        const { data, error: fetchError } = await client
          .rpc('get_project_id_by_form_id', { p_form_id: formId })
          .maybeSingle();

        // Only update state if component is still mounted
        if (!isMounted) return;

        if (fetchError) {
          debugError("Error resolving form ID:", fetchError);
          setError("Unable to load the form. The link may be invalid or expired.");
          setProjectId(null);
        } else if (data) {
          debugLog("Resolved project ID:", data);
          setProjectId(data);
          setError(null);
        } else {
          debugError("No project ID found for form ID:", formId);
          setError("This form link appears to be invalid or expired.");
          setProjectId(null);
        }
      } catch (err) {
        // Only update state if component is still mounted
        if (!isMounted) return;

        debugError("Error in project ID resolution:", err);
        setError("An unexpected error occurred while loading the form.");
        setProjectId(null);
      } finally {
        // Only update state if component is still mounted
        if (isMounted) {
          // Add a small delay to ensure a minimum loading time
          timeoutId = setTimeout(() => {
            if (isMounted) {
              setLoading(false);
            }
          }, 300);
        }
      }
    };

    setLoading(true);
    void resolveFormId();

    // Cleanup function to prevent updates if component unmounts
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [formId, isPublic]);

  return { projectId, loading, error };
};
