export type TriangleSelectionGroup = {
  id: "A" | "B";
  storyIds: string[];
  createdAt: string;
  selectionMethod: "drag_selection";
  questionId: string;
  selectionCount: number;
  triangleQuestionLabel?: string;
  projectId?: string;
};

export type TriangleComparisonContext = {
  source: "triangle_selection" | "slider_selection";
  questionId: string;
  secondaryQuestionId?: string;
  groups: [TriangleSelectionGroup, TriangleSelectionGroup];
  sharedStoryIds: string[];
  
  savedComparisonId?: string;
  savedComparisonTitle?: string;
  openedAt?: number;
};
