import { debugError } from "@/utils/debugLogger";
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiAssistantService } from "@/services/aiAssistantService";
import { useQuestionImprover } from "./useQuestionImprover";
import ImprovementForm from "./ImprovementForm";
import ImprovementResponse from "./ImprovementResponse";
import ImproverError from "./ImproverError";
import { debugLog } from "@/utils/debugLogger";

interface QuestionImproverProps {
  initialQuestion: string;
  onAcceptImprovement: (improvedQuestion: string, savedToDb?: boolean) => void;
}

export const QuestionImprover: React.FC<QuestionImproverProps> = ({
  initialQuestion,
  onAcceptImprovement
}) => {
  const [improvementResponse, setImprovementResponse] = useState("");
  const [improvementError, setImprovementError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  // Track the latest question including unaccepted AI responses
  const latestQuestionRef = useRef(initialQuestion);

  const {
    improvementPrompt,
    localQuestion,
    acceptLoading,
    handleImprovementPrompt,
    handleAcceptImprovement,
    createImprovedQuestionPrompt,
    setImprovementPrompt
  } = useQuestionImprover({
    initialQuestion,
    onAcceptImprovement
  });

  // Update ref when localQuestion changes
  useEffect(() => {
    latestQuestionRef.current = localQuestion;
  }, [localQuestion]);

  // When AI returns a new response, update the latest question ref
  useEffect(() => {
    if (improvementResponse) {
      latestQuestionRef.current = improvementResponse;
    }
  }, [improvementResponse]);

  const handleSubmitImprovement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!improvementPrompt.trim()) return;

    setIsRequesting(true);
    setImprovementError(null);
    try {
      // Use the latest question (which may be an unaccepted AI response)
      const fullPrompt = createImprovedQuestionPrompt(latestQuestionRef.current, improvementPrompt);

      // Call AI service using the dedicated improve mode
      const result = await aiAssistantService.callAssistant({
        prompt: fullPrompt,
        mode: 'improve',
      });

      if (result.error) {
        debugError("Error improving question:", result.error);
        setImprovementError(result.error);
        return;
      }

      if (result.response) {
        debugLog("Improvement response:", result.response);
        setImprovementResponse(result.response);
      }
    } catch (error) {
      debugError("Error requesting improvement:", error);
      setImprovementError("Unable to improve the question right now. Please try again in a few moments.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleAcceptClick = () => {
    void handleAcceptImprovement(improvementResponse);
    setImprovementResponse("");
    setImprovementPrompt("");
  };

  return (
    <Card className="bg-gray-50 dark:bg-[#161B22] border border-gray-200 dark:border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium dark:text-gray-200">Improve Your Question</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          How would you like to improve your question?
        </p>

        <ImprovementForm
          improvementPrompt={improvementPrompt}
          onImprovementPromptChange={handleImprovementPrompt}
          onSubmit={(e) => void handleSubmitImprovement(e)}
          loading={isRequesting}
        />

        {improvementResponse && (
          <ImprovementResponse
            response={improvementResponse}
            onAccept={handleAcceptClick}
            loading={acceptLoading}
          />
        )}

        <ImproverError error={improvementError} />
      </CardContent>
    </Card>
  );
};
