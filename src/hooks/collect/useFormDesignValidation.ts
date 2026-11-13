import { useActivityCompletionQuery } from "@/hooks/queries/useActivityCompletionQuery";

interface FormDesignValidationResult {
  isFormDesigned: boolean;
  hasStoryQuestion: boolean;
  hasSliderQuestions: boolean;
  hasTriangleQuestions: boolean;
  hasParticipantQuestions: boolean;
  // Stricter validation for form integrity
  hasFormIntegrity: boolean;
  integrityErrors: string[];
  integrityWarnings: string[];
  isLoading: boolean;
  checkFormDesign: () => Promise<void>;
}

export const useFormDesignValidation = (projectId?: string | null): FormDesignValidationResult => {
  // Use the standard cached query for activity completion
  // This is much faster than checking DB states manually or deep-checking content
  // We use refetch instead of manual state management
  const { data: completedActivities, isLoading, refetch } = useActivityCompletionQuery(projectId || undefined);

  // Derived states from the completed set
  // Check for both singular and plural forms for backward compatibility
  const hasStoryQuestion = completedActivities ?
    (completedActivities.has('story-questions') || completedActivities.has('story-question')) : false;

  // Slider questions might be stored as 'slider-questions' or generic 'questions' if legacy
  const hasSliderQuestions = completedActivities ? completedActivities.has('slider-questions') : false;

  // Triangle questions
  const hasTriangleQuestions = completedActivities ? completedActivities.has('triangle-questions') : false;

  // Participant questions
  const hasParticipantQuestions = completedActivities ? completedActivities.has('participant-questions') : false;

  // Manual refresh function (wraps refetch)
  const checkFormDesign = async () => {
    await refetch();
  };

  // Original OR-based check (at least one question type exists)
  const isFormDesigned = hasStoryQuestion || hasSliderQuestions || hasTriangleQuestions || hasParticipantQuestions;

  // Stricter AND-based check for form integrity
  // Required: Story question AND (Sliders OR Triangles)
  const hasQuestionType = hasSliderQuestions || hasTriangleQuestions;
  const hasFormIntegrity = hasStoryQuestion && hasQuestionType;

  // Build integrity errors (required elements)
  const integrityErrors: string[] = [];
  if (!hasStoryQuestion) {
    integrityErrors.push("Story question is required");
  }
  if (!hasQuestionType) {
    integrityErrors.push("At least one slider or triangle question is required");
  }

  // Build integrity warnings (optional elements)
  const integrityWarnings: string[] = [];
  if (!hasParticipantQuestions) {
    integrityWarnings.push("No participant questions configured (optional)");
  }

  return {
    isFormDesigned,
    hasStoryQuestion,
    hasSliderQuestions,
    hasTriangleQuestions,
    hasParticipantQuestions,
    hasFormIntegrity,
    integrityErrors,
    integrityWarnings,
    isLoading,
    checkFormDesign
  };
};
