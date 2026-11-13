import { debugError } from "@/utils/debugLogger";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { processAIResponse } from "./questionUtils";
import { debugLog } from "@/utils/debugLogger";

interface UseQuestionImproverProps {
  initialQuestion: string;
  onAcceptImprovement?: (improvedQuestion: string, savedToDb?: boolean) => void;
}

export const useQuestionImprover = ({
  initialQuestion,
  onAcceptImprovement
}: UseQuestionImproverProps) => {
  const [improvementPrompt, setImprovementPrompt] = useState("");
  const [localQuestion, setLocalQuestion] = useState(initialQuestion);
  const [acceptLoading, setAcceptLoading] = useState(false);

  // Update local question when initialQuestion prop changes
  useEffect(() => {
    debugLog("useQuestionImprover received new initialQuestion:", initialQuestion);

    // Process and clean the question
    const cleanQuestion = processAIResponse(initialQuestion);
    setLocalQuestion(cleanQuestion);

    // Reset the improvement prompt when initial question changes
    setImprovementPrompt("");
  }, [initialQuestion]);

  const handleImprovementPrompt = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setImprovementPrompt(e.target.value);
  };

  const handleAcceptImprovement = async (response: string) => {
    if (!response || !onAcceptImprovement) return;

    // Show loading state immediately
    setAcceptLoading(true);

    try {
      // Clean and process the question
      const extractedQuestion = processAIResponse(response);

      debugLog("handleAcceptImprovement - extracted question:", extractedQuestion);

      // Update the local question immediately to provide visual feedback
      setLocalQuestion(extractedQuestion);

      // First update the parent component to ensure UI updates immediately and saves it
      onAcceptImprovement(extractedQuestion, false);

      // Clear the improvement prompt
      setImprovementPrompt("");
    } catch (error) {
      debugError("Error processing improvement:", error);
      toast({
        title: "Error",
        description: "Failed to process the improvement",
        variant: "destructive"
      });
    } finally {
      setAcceptLoading(false);
    }
  };

  // Create optimized prompt for faster AI response
  const createImprovedQuestionPrompt = (question: string, direction: string): string => {
    return [
      "You are improving an existing story question based on the user's instructions.",
      `Current question: "${question}"`,
      `User's instruction: "${direction}"`,
      "Rules:",
      "- Follow the user's instruction fully and faithfully.",
      "- If the instruction asks to remove a theme, concept, or word, rewrite the question without it, drawing on the project context to find a better angle.",
      "- If the instruction asks for a major change, make a major change. If it asks for a small tweak, make a small tweak.",
      "- The result must still be a valid, open-ended story question that invites personal narrative.",
      "- Return only the revised question text. No explanations.",
    ].join("\n");
  };

  return {
    improvementPrompt,
    localQuestion,
    acceptLoading,
    handleImprovementPrompt,
    handleAcceptImprovement,
    createImprovedQuestionPrompt,
    setImprovementPrompt
  };
};
