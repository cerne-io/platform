import { useQuery } from "@tanstack/react-query";
import { formLanguageService } from "@/services/formLanguageService";

export const useProjectLanguages = (projectId?: string) => {
  return useQuery({
    queryKey: ['project-languages', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      return await formLanguageService.getLanguageConfig(projectId);
    },
    enabled: !!projectId
  });
};
