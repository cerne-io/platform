import { supabase } from "@/integrations/supabase/client";
import type { LocalDbError } from "@/lib/localClient";
import { Project } from "@/types/project";
import { debugLog, debugError } from "@/utils/debugLogger";

export const fetchProjectById = async (
  projectId: string
): Promise<{ data: Project | null; error: LocalDbError | Error | null }> => {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, name, description, is_active, is_archived, lifetime_stories_collected, topup_story_capacity, is_event_mode, is_template, user_id, activated_at, expires_at, created_at, updated_at"
      )
      .eq("id", projectId)
      .limit(1)
      .single();

    if (error) {
      debugError("Error fetching project:", error);
      return { data: null, error };
    }

    if (data) {
      debugLog("Fetched project:", data.name);
      return {
        data: {
          ...data,
          user_role: "owner",
        } as Project,
        error: null,
      };
    }

    return { data: null, error: null };
  } catch (error) {
    debugError("Failed to fetch project:", error);
    return { data: null, error: error as Error };
  }
};
