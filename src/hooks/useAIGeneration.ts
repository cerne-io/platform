
import { useState, useEffect } from "react";
import { aiAssistantService } from "@/services/aiAssistantService";
import { debugError } from "@/utils/debugLogger";

export const useAIGeneration = (projectId: string) => {
  const [response, setResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear state and load project-specific AI response when projectId changes
  useEffect(() => {
    if (!projectId) {
      setResponse("");
      setError(null);
      return;
    }

    // Load project-specific AI response from localStorage if it exists
    try {
      const cachedResponse = localStorage.getItem(`ai_story_question_response_${projectId}`);
      const cachedTimestamp = localStorage.getItem(`ai_story_question_response_timestamp_${projectId}`);

      if (cachedResponse && cachedTimestamp) {
        setResponse(cachedResponse);
      } else {
        setResponse("");
      }
      setError(null);
    } catch (storageError) {
      debugError("Error loading AI response from localStorage:", storageError);
      setResponse("");
      setError(null);
    }
  }, [projectId]);

  interface GenerateOptions {
    promptKey?: string;
    promptVariables?: Record<string, string>;
  }

  const generateResponse = async (
    prompt: string,
    context?: string,
    options?: GenerateOptions
  ): Promise<void> => {
    if (!prompt.trim()) {
      setError("Please provide a prompt for AI generation");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await aiAssistantService.callAssistant({
        prompt,
        projectContext: context || "",
        mode: 'storyQuestion',
        promptKey: options?.promptKey,
        promptVariables: options?.promptVariables
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setResponse(result.response || "");

      // Store in localStorage with a timestamp
      try {
        if (projectId && result.response) {
          localStorage.setItem(`ai_story_question_response_${projectId}`, result.response);
          localStorage.setItem(`ai_story_question_response_timestamp_${projectId}`, Date.now().toString());
        }
      } catch (storageError) {
        debugError("Error storing AI response in localStorage:", storageError);
      }
    } catch (err: unknown) {
      debugError("Error generating AI response:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred while generating content";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResponse = () => {
    setResponse("");
    setError(null);

    // Clear from localStorage if applicable
    try {
      if (projectId) {
        localStorage.removeItem(`ai_story_question_response_${projectId}`);
        localStorage.removeItem(`ai_story_question_response_timestamp_${projectId}`);
      }
    } catch (error) {
      debugError("Error clearing AI response from localStorage:", error);
    }
  };

  return {
    response,
    isLoading,
    error,
    generateResponse,
    clearResponse
  };
};
