
import React from "react";
import { FormProvider } from "@/contexts/form";
import { useFormDataWithQuery } from "@/hooks/collect/useFormDataWithQuery";
import { useFormSubmissionHandler } from "@/hooks/collect/useFormSubmissionHandler";
import EmptyFormState from "@/components/collect/EmptyFormState";
import FormLoadingState from "@/components/collect/FormLoadingState";
import StoryForm from "@/components/collect/StoryForm";
import { useStoryQuestion } from "@/hooks/useStoryQuestion";
import { StoryData } from "@/hooks/collect/form-submission/types";


import { useProject } from "@/contexts/ProjectContext";
import { setLastLoadedProjectId } from "@/services/cache/projectCache";
import { filterQuestionsByType } from "@/utils/filterQuestionsByType";
import { 
  localizeStoryQuestion, 
  localizeSliderQuestion, 
  localizeTriangleQuestion, 
  localizeParticipantQuestion 
} from "@/utils/formLocalization";


interface AuthenticatedFormContainerProps {
  projectId?: string;
  activeLang?: string;
}

const AuthenticatedFormContainer: React.FC<AuthenticatedFormContainerProps> = ({
  projectId,
  activeLang = 'en',
}) => {
  // Use the TanStack Query form data loader
  const formData = useFormDataWithQuery(projectId || null, false);

  const storyQuestionData = useStoryQuestion(projectId || "");
  const { savedQuestion } = storyQuestionData;
  const { handleFormSubmit } =
    useFormSubmissionHandler(false, projectId);

  const { activeProject } = useProject();



  /* Hook definitions must be before early returns */
  const finalStoryQuestion =
    (savedQuestion ? localizeStoryQuestion(savedQuestion, activeLang) : null) ||
    (formData.storyQuestion 
      ? localizeStoryQuestion(formData.storyQuestion, activeLang)
      : "");

  const handleSubmit = React.useCallback(async (data: StoryData): Promise<boolean> => {
    const enhancedData = {
      ...data,
      projectId: projectId || activeProject?.id,
    };
    const result = await handleFormSubmit(enhancedData);

    if (projectId) {
      setLastLoadedProjectId(projectId);
    }

    return result === true;
  }, [projectId, activeProject?.id, handleFormSubmit]);

  if (formData.isLoading) return <FormLoadingState />;
  if (!projectId) return <EmptyFormState />;

  return (
    <div>
      <FormProvider
          key={`${activeLang}-${formData.emotionalResponseQuestion?.options?.map(o => `${o.id}:${o.label}`).join('|') || ''}`}
          initialValues={{
            storyQuestion: finalStoryQuestion,
            ...filterQuestionsByType(
              (formData.sliderQuestions || []).map(q => localizeSliderQuestion(q, activeLang)),
              (formData.triangleQuestions || []).map(q => localizeTriangleQuestion(q, activeLang)),
              formData.questionType
            ),
            participantQuestions: (formData.participantQuestions || []).map(q => localizeParticipantQuestion(q, activeLang)),
            emotionalResponseQuestion: formData.emotionalResponseQuestion,
            activeLang,
          }}
          onSubmit={handleSubmit}
        >
          <StoryForm isPublic={false} />
        </FormProvider>
    </div>
  );
};

export default AuthenticatedFormContainer;
