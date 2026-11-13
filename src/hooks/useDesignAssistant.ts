
import { useState, useEffect, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { buildProjectContext } from "@/utils/project-context";
import { aiAssistantService } from "@/services/aiAssistantService";
import { ChatMessage, AssistantMode } from "@/types/chatTypes";
import { debugLog, debugError } from "@/utils/debugLogger";
import { useGuidedDesign } from "@/hooks/useGuidedDesign";

interface UseDesignAssistantProps {
  mode?: AssistantMode;
  projectContext: string;
  onActivitySaved?: () => void;
}

export const useDesignAssistant = ({
  mode = 'design',
  projectContext = '',
  onActivitySaved
}: UseDesignAssistantProps) => {
  const { activeProject } = useProject();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Try to load from localStorage if we have a project ID
    if (activeProject?.id && mode === 'general') {
      try {
        const key = `design-assistant-chat-${activeProject.id}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Convert timestamp strings back to Date objects
          return parsed.map((msg: Record<string, unknown>) => ({
            ...msg,
            timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : undefined
          })) as ChatMessage[];
        }
      } catch (e) {
        debugError("Failed to load chat history", e);
      }
    }
    return [];
  });

  // Save to localStorage whenever messages change
  useEffect(() => {
    if (activeProject?.id && mode === 'general') {
      try {
        const key = `design-assistant-chat-${activeProject.id}`;
        if (messages.length > 0) {
          localStorage.setItem(key, JSON.stringify(messages));
        }
      } catch (e) {
        debugError("Failed to save chat history", e);
      }
    }
  }, [messages, activeProject?.id, mode]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [autoPrompt] = useState(
    mode === 'storyQuestion'
      ? "Suggest a story question for my project"
      : ""
  );
  const [response, setResponse] = useState("");

  // Guided Design mode
  const guidedDesign = useGuidedDesign({
    projectId: activeProject?.id || "",
    projectContext: projectContext || "",
    messages: messages,
    onAddMessages: (newMessages) => setMessages(prev => [...prev, ...newMessages]),
    onActivitySaved,
  });

  const handleSubmit = useCallback(async (e?: React.FormEvent, customPrompt?: string) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    const promptToUse = customPrompt || prompt.trim();

    if (!promptToUse) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      });
      return;
    }


    // --- Guided Design mode intercept ---
    // handleGuidedDesignMessage handles all AI response logic internally.
    // Intercept both 'asking' (first answer) and 'awaiting_confirmation' (adding more).
    if (guidedDesign.isActive && (guidedDesign.guidedDesignState === 'asking' || guidedDesign.guidedDesignState === 'awaiting_confirmation')) {
      const userMsg: ChatMessage = { role: 'user', content: promptToUse, timestamp: new Date() };
      setMessages(prev => [...prev, userMsg]);
      setPrompt("");
      await guidedDesign.handleGuidedDesignMessage(promptToUse);
      return;
    }
    // --- End Guided Design mode intercept ---


    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);

      const userMessage: ChatMessage = {
        role: 'user',
        content: promptToUse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);

      setPrompt("");

      let context = projectContext;

      if ((mode === 'storyQuestion' || mode === 'improve') && !context && activeProject) {
        context = buildProjectContext({
          name: activeProject.name,
          description: activeProject.description ?? undefined,
          id: activeProject.id
        });
      }

      const result = await aiAssistantService.callAssistant({
        prompt: promptToUse,
        projectContext: context,
        mode,
      });

      if (result.error) {
        setErrorCode(result.errorCode || null);
        throw new Error(result.error);
      }

      const responseText = result.response || "";

      if (responseText) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: responseText,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        setResponse(responseText);

      } else {
        toast({
          title: "Warning",
          description: "Received empty response from AI assistant",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      debugError("Error calling AI assistant:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage || "Failed to get response from AI assistant");
      toast({
        title: "Error",
        description: errorMessage || "Failed to get response from AI assistant",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [prompt, mode, projectContext, activeProject, guidedDesign]);


  const handleSuggestNextStep = useCallback(async () => {
    debugLog("[useDesignAssistant] Suggesting next step");

    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);

      // Add a dummy user message to show what's happening
      const userMessage: ChatMessage = {
        role: 'user',
        content: "Suggest next step",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);

      const result = await aiAssistantService.callAssistant({
        prompt: "Please suggest the next step based on the project context.",
        projectContext: projectContext,
        mode: 'suggestNextStep' as AssistantMode,
      });

      if (result.error) {
        setErrorCode(result.errorCode || null);
        throw new Error(result.error);
      }

      const responseText = result.response || "";

      if (responseText) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: responseText,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        setResponse(responseText);
      }
    } catch (error: unknown) {
      debugError("Error calling AI assistant for suggest next step:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage || "Failed to get suggestion from AI assistant");
      toast({
        title: "Error",
        description: errorMessage || "Failed to get suggestion from AI assistant",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [projectContext]);

  const handleGenerateStoryQuestion = useCallback(() => {
    debugLog("[useDesignAssistant] Generating story question with prompt:", autoPrompt);
    void handleSubmit(undefined, autoPrompt);
  }, [autoPrompt, handleSubmit]);

  const clearChat = () => {
    setMessages([]);
    setResponse("");
    setError(null);

    // Clear from localStorage
    if (activeProject?.id && mode === 'general') {
      try {
        const key = `design-assistant-chat-${activeProject.id}`;
        localStorage.removeItem(key);
      } catch (e) {
        debugError("Failed to clear chat history", e);
      }
    }
  };

  return {
    prompt,
    setPrompt,
    messages,
    loading,
    error,
    errorCode,
    handleSubmit,
    handleSuggestNextStep,
    handleGenerateStoryQuestion,
    clearChat,
    response,
    setResponse,
    guidedDesign,
  };
};
