
import { useState, useEffect } from "react";
import { processAIResponse } from "../../improver/questionUtils";
import { debugLog } from "@/utils/debugLogger";


export const useResponseProcessing = (response: string, currentQuestion: string | Record<string, string> | null = null) => {
  // Initialize from currentQuestion if available
  const initialText = currentQuestion 
    ? (typeof currentQuestion === 'string' ? currentQuestion : (currentQuestion['en'] || Object.values(currentQuestion)[0] || ""))
    : "";

  const [displayQuestion, setDisplayQuestion] = useState<string>(initialText);
  const [questionSaved, setQuestionSaved] = useState(!!initialText);

  // Process the response when it changes or when currentQuestion changes
  useEffect(() => {
    // Determine what to display based on available data
    const determineQuestionToDisplay = () => {
      // If we have a current question, it's likely already saved
      if (currentQuestion) {
        // Handle both string and object (translation) versions
        const questionText = typeof currentQuestion === 'string' 
          ? currentQuestion 
          : (currentQuestion['en'] || Object.values(currentQuestion)[0] || "");

        if (questionText && questionText.trim() !== "") {
          debugLog("[useResponseProcessing] Using current question text for display:", questionText.substring(0, 50));

          setDisplayQuestion(questionText);
          setQuestionSaved(true);

          return;
        }
      }

      // If no current question but we have a response, process it as new AI suggestion
      if (response && response.trim() !== "") {
        debugLog("[useResponseProcessing] Processing AI response suggestion:", response.substring(0, 50));
        const processedResponse = processAIResponse(response);

        if (processedResponse && processedResponse.trim() !== "") {
          setDisplayQuestion(processedResponse);
          setQuestionSaved(false);

          return;
        }
      }

      // If we get here, we have no valid question to display
      debugLog("[useResponseProcessing] No valid question available for display");
      setDisplayQuestion("");
      setQuestionSaved(false);
    };

    determineQuestionToDisplay();
  }, [response, currentQuestion]);

  return {
    displayQuestion,
    setDisplayQuestion,
    questionSaved,
    setQuestionSaved
  };
};
