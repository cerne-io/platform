import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Project } from '@/types/project';

export const templateProjectsQueryKey = ['projects', 'templates'] as const;

/**
 * Fetch all template projects (public to everyone)
 */
export const useTemplateProjectsQuery = () => {
  return useQuery<Project[], Error>({
    queryKey: templateProjectsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("is_template", true);

      if (error) {
        throw error;
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes (templates change less frequently)
  });
};
