import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Project } from "@/types/project";

export const projectsQueryKey = ["projects", "user"] as const;

export const useProjectsQuery = () => {
  const { user, loading } = useAuth();
  return useQuery<Project[], Error>({
    queryKey: [...projectsQueryKey, user?.id ?? "anonymous"],
    queryFn: async () => {
      if (!user) {
        return [];
      }

      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("is_template", false)
        .order("created_at", { ascending: false });

      if (projectsError) {
        throw projectsError;
      }

      const projects = projectsData || [];
      if (projects.length === 0) {
        return [];
      }

      const projectIds = projects.map((p) => p.id);

      const [
        { data: statsData, error: statsError },
        { data: identifierData, error: identifierError },
      ] = await Promise.all([
        supabase
          .from("project_story_stats")
          .select("*")
          .in("project_id", projectIds),
        supabase
          .from("form_identifiers")
          .select("id, fi_project_id, start_date, end_date")
          .in("fi_project_id", projectIds),
      ]);

      if (statsError) {
        console.error("Failed to fetch project stats:", statsError);
        throw statsError;
      }

      if (identifierError) {
        console.error("Failed to fetch form identifiers:", identifierError);
        throw identifierError;
      }

      const statsMap = new Map(
        (statsData || []).map((stat) => [stat.project_id, stat])
      );
      const identifierMap = new Map(
        (identifierData || []).map((item) => [item.fi_project_id, item])
      );

      const now = new Date();

      return projects.map((project) => {
        const identifiers = identifierMap.get(project.id);
        let isActive = false;

        if (identifiers) {
          const startDate = identifiers.start_date
            ? new Date(identifiers.start_date)
            : null;
          const endDate = identifiers.end_date
            ? new Date(identifiers.end_date)
            : null;

          const isAfterStart = !startDate || now >= startDate;
          const isBeforeEnd = !endDate || now <= endDate;
          isActive = isAfterStart && isBeforeEnd;
        }

        const stats = statsMap.get(project.id);
        const storiesCount = stats?.stories_count ? Number(stats.stories_count) : 0;
        const lastStoryAt = stats?.last_story_at || undefined;

        return {
          ...project,
          user_role: "owner" as const,
          stories_count: storiesCount,
          last_story_at: lastStoryAt,
          has_active_link: isActive,
        };
      });
    },
    enabled: !loading && Boolean(user),
    staleTime: 1000 * 60 * 5,
  });
};
