
import React, { useEffect } from "react";
import { useForm } from "@/contexts/form";
import StoryQuestion from "@/components/collect/form-fields/StoryQuestion";
import SliderQuestions from "@/components/collect/form-fields/SliderQuestions";
import TriangleQuestions from "@/components/collect/form-fields/TriangleQuestions";
import ParticipantQuestions from "@/components/collect/form-fields/ParticipantQuestions";
import AdditionalComments from "@/components/collect/form-fields/AdditionalComments";
import SubmitButton from "@/components/collect/SubmitButton";
import StoryTitle from "./StoryTitle";
import EmotionalResponse from "./EmotionalResponse";
import { FormAppearance } from "@/components/design/form-appearance/types";
import { debugLog } from "@/utils/debugLogger";

// Update the props interface to include appearance
interface StoryFormProps {
  isPublic?: boolean;
  appearance?: FormAppearance;
}

const StoryForm: React.FC<StoryFormProps> = ({ isPublic = false, appearance }) => {
  const {
    handleSubmit,
    sliderQuestions,
    triangleQuestions,
    participantQuestions,
    isSubmitting,
    feeling,
    setFeeling,
    otherFeeling,
    setOtherFeeling,
    setAdditionalComments,
    handleParticipantAnswerChange,
    participantAnswers,
    sliderValues,
    handleSliderChange,
    touchedSliders,
    setTouchedSliders,
    triangleValues,
    handleTriangleChange,
    touchedTriangles,
    setTouchedTriangles,
    emotionalResponseQuestion,
    activeLang,
  } = useForm();

  // Debug effect for participant questions and answers
  useEffect(() => {
    debugLog("StoryForm rendered with:", {
      isPublic,
      sliderQuestionsCount: sliderQuestions?.length || 0,
      triangleQuestionsCount: triangleQuestions?.length || 0,
      participantQuestionsCount: participantQuestions?.length || 0,
      hasAppearance: !!appearance,
      hasCustomEmotionalResponse: !!emotionalResponseQuestion
    });
  }, [isPublic, participantQuestions, participantAnswers, sliderQuestions, sliderValues, triangleQuestions, triangleValues, appearance, emotionalResponseQuestion]);

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-8">
      {/* Use appropriate form spacing and styling for public forms */}
      <div className={`space-y-6 ${isPublic ? 'px-2 md:px-4' : ''}`}>
        {/* First show the StoryQuestion component */}
        <StoryQuestion isPublic={isPublic} />

        {/* Then show the StoryTitle component */}
        <StoryTitle isPublic={isPublic} />

        {/* Add the EmotionalResponse component */}
        <EmotionalResponse
          feeling={feeling}
          otherFeeling={otherFeeling}
          onFeelingChange={setFeeling}
          onOtherFeelingChange={setOtherFeeling}
          isPublic={isPublic}
          customQuestion={emotionalResponseQuestion}
          activeLang={activeLang}
        />

        {/* Add slider questions if available */}
        {sliderQuestions && sliderQuestions.length > 0 && (
          <SliderQuestions
            questions={sliderQuestions}
            sliderValues={sliderValues}
            onSliderChange={handleSliderChange}
            touchedSliders={touchedSliders}
            setTouchedSliders={setTouchedSliders}
            isPublic={isPublic}
          />
        )}

        {/* Add triangle questions if available */}
        {triangleQuestions && triangleQuestions.length > 0 && (
          <TriangleQuestions
            questions={triangleQuestions}
            triangleValues={triangleValues}
            onTriangleChange={handleTriangleChange}
            touchedTriangles={touchedTriangles}
            setTouchedTriangles={setTouchedTriangles}
            isPublic={isPublic}
          />
        )}

        {/* Add participant questions if available */}
        {participantQuestions && Array.isArray(participantQuestions) && participantQuestions.length > 0 && (
          <ParticipantQuestions
            participantQuestions={participantQuestions}
            participantAnswers={participantAnswers}
            onAnswerChange={handleParticipantAnswerChange}
            isPublic={isPublic}
          />
        )}

        {/* Add additional comments section */}
        <AdditionalComments
          onChange={(e) => setAdditionalComments(e.target.value)}
          isPublic={isPublic}
        />
      </div>

      <SubmitButton isSubmitting={isSubmitting} isPublic={isPublic} />
    </form>
  );
};

export default StoryForm;
