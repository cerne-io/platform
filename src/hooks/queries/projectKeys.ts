export const projectKeys = {
  all: ['projects'] as const,
  detail: (userId: string | null, projectId: string | null) => [...projectKeys.all, 'detail', userId, projectId] as const,
};
