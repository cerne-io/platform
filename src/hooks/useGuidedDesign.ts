
import { useState, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import { contextPhase } from "@/data/phases/contextPhase";
import { definePhase } from "@/data/phases/definePhase";
import { fetchActivityResponse } from "@/services/supabaseSync/operations";
import { saveActivityResponse } from "@/services/supabaseSync/operations/save/saveActivityResponse";
import { aiAssistantService } from "@/services/aiAssistantService";
import { ChatMessage } from "@/types/chatTypes";
import { debugLog, debugError } from "@/utils/debugLogger";
import { getQuestionFields } from "@/components/design/utils/fields";

export interface GuidedDesignQuestion {
  phaseId: string;
  stepId: string;
  activityId: string;
  activityTitle: string;
  stepTitle: string;
  question: string;
}

export type GuidedDesignState =
  | "idle"
  | "loading_questions"
  | "asking"
  | "awaiting_confirmation" // user answered, show Proceed / Pause buttons
  | "saving"
  | "complete"
  | "paused";

interface UseGuidedDesignProps {
  projectId: string;
  projectContext: string;
  messages: ChatMessage[];
  onAddMessages: (messages: ChatMessage[]) => void;
  onActivitySaved?: () => void;
}

export const useGuidedDesign = ({
  projectId,
  projectContext,
  messages,
  onAddMessages,
  onActivitySaved,
}: UseGuidedDesignProps) => {
  const [guidedDesignState, setGuidedDesignState] = useState<GuidedDesignState>("idle");
  const [queue, setQueue] = useState<GuidedDesignQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Helper: post a question as an assistant message
  const askQuestion = useCallback(
    (question: GuidedDesignQuestion, allCount: number, current: number) => {
      const label = `${question.stepTitle} › ${question.activityTitle}`;
      const content = `**[${current + 1}/${allCount}] ${label}**\n\n${question.question}`;
      onAddMessages([{ role: "assistant", content, timestamp: new Date() }]);
    },
    [onAddMessages]
  );

  // Start Guided Design: load questions, filter answered, ask first one
  const startGuidedDesign = useCallback(async () => {
    if (!projectId) return;

    // Reactivate if paused
    if (guidedDesignState === "paused") {
      setGuidedDesignState(pendingAnswer ? (isEvaluating ? "asking" : "asking") : "asking"); // Usually it resumes to asking or awaiting_confirmation, but pendingAnswer might dictate otherwise. Actually, if it was awaiting_confirmation but paused (which shouldn't happen right now, since we removed auto-save on pause, wait, let's just resume to asking).
      // Let's accurately restore state. If pendingAnswer exists and it was awaiting_confirmation?
      // For simplicity, resume to 'asking'. If they have a complete answer, they click submit.
      setGuidedDesignState("asking");
      onAddMessages([
        {
          role: "assistant",
          content: "Let's pick up where we left off...",
          timestamp: new Date(),
        },
      ]);
      if (queue.length > 0 && queue[currentIndex]) {
        askQuestion(queue[currentIndex], queue.length, currentIndex);
      }
      return;
    }

    setGuidedDesignState("loading_questions");

    onAddMessages([
      {
        role: "assistant",
        content:
          "Let's fill in your project details together! I'll ask you questions one by one. Just answer in your own words — you can always edit your answers later by going directly to the Context and Define activities.\n\nChecking which steps are still outstanding…",
        timestamp: new Date(),
      },
    ]);

    try {
      // Build the full flat list of questions
      const allQuestions: GuidedDesignQuestion[] = [];
      for (const phase of [contextPhase, definePhase]) {
        for (const step of phase.steps) {
          for (const activity of step.activities) {
            allQuestions.push({
              phaseId: phase.id,
              stepId: step.id,
              activityId: activity.id,
              activityTitle: activity.title,
              stepTitle: step.title,
              question: activity.description,
            });
          }
        }
      }

      // Filter out already-answered ones
      const checks = allQuestions.map((q) =>
        fetchActivityResponse<unknown>(projectId, q.phaseId, q.stepId, q.activityId, null)
          .then((result) => ({ q, hasAnswer: !!result }))
      );
      const checkResults = await Promise.all(checks);
      const unanswered = checkResults.filter((r) => !r.hasAnswer).map((r) => r.q);

      if (unanswered.length === 0) {
        onAddMessages([
          {
            role: "assistant",
            content:
              "Great news — you've already answered all the Context and Define questions! You can edit them at any time from the activity tabs.",
            timestamp: new Date(),
          },
        ]);
        setGuidedDesignState("complete");
        return;
      }

      setQueue(unanswered);
      setCurrentIndex(0);
      setGuidedDesignState("asking");
      askQuestion(unanswered[0], unanswered.length, 0);
    } catch (err) {
      debugError("[useGuidedDesign] Error starting Guided Design:", err);
      onAddMessages([
        {
          role: "assistant",
          content: "Sorry, I had trouble loading the questions. Please try again.",
          timestamp: new Date(),
        },
      ]);
      setGuidedDesignState("idle");
    }
  }, [
    projectId,
    askQuestion,
    onAddMessages,
    guidedDesignState,
    pendingAnswer,
    isEvaluating,
    queue,
    currentIndex,
  ]);

  // Single AI call: classify user message AND generate a one-sentence reply.
  const evaluateAndRespond = useCallback(async (
    userMessage: string,
    question: GuidedDesignQuestion,
    currentHistory: ChatMessage[]
  ): Promise<
    | { type: "complete" | "partial" | "clarification"; reply: string }
    | { type: "error"; error: string }
  > => {
    try {
      // Format recent history (last 4 messages)
      const recentHistory = currentHistory
        .slice(-4)
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      const fields = getQuestionFields(question.phaseId, question.stepId, question.activityId);
      const isListActivity = Boolean(fields[0]?.isList);

      const promptVariables = {
        question: question.question,
        userMessage: userMessage,
        phase: question.phaseId,
        step: question.stepTitle,
        activity: question.activityTitle,
        expectsMultiple: isListActivity ? "true" : "false",
        history: recentHistory || "No previous history in this session.",
        goalCount: isListActivity ? "3" : "1",
      };

      debugLog("[useGuidedDesign] evaluateAndRespond - userMessage:", userMessage);
      debugLog("[useGuidedDesign] evaluateAndRespond - history:", recentHistory);

      const result = await aiAssistantService.callAssistant({
        prompt: "Please evaluate the user's latest response based on the system instructions.",
        projectContext: projectContext,
        mode: "general",
        promptKey: "guided_design_evaluation",
        promptVariables: promptVariables
      });

      if (result.error) {
        debugError("[useGuidedDesign] evaluateAndRespond AI error:", result.errorCode, result.error);
        return { type: "error", error: result.error };
      }

      const raw = (result.response || "").trim();
      debugLog("[useGuidedDesign] evaluateAndRespond raw:", raw);

      // Strip possible markdown code fences
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

      if (!cleaned) {
        debugError("[useGuidedDesign] evaluateAndRespond - empty response");
        return { type: "partial", reply: "I didn't catch that. Could you please try again?" };
      }

      let parsed;
      try {
        parsed = JSON.parse(cleaned) as { type: string; reply: string };
      } catch (parseErr) {
        debugError("[useGuidedDesign] evaluateAndRespond - JSON parse error:", parseErr, "raw:", raw);
        return { type: "partial", reply: "I had some trouble processing that. Feel free to continue or add more detail." };
      }

      if (
        (parsed.type === "complete" || parsed.type === "partial" || parsed.type === "clarification") &&
        typeof parsed.reply === "string"
      ) {
        return { type: parsed.type as "complete" | "partial" | "clarification", reply: parsed.reply };
      }

      return { type: "partial", reply: "Got it — feel free to add more detail if you'd like." };
    } catch (err) {
      debugError("[useGuidedDesign] evaluateAndRespond error:", err);
      return {
        type: "error",
        error: err instanceof Error ? err.message : "Failed to evaluate your response.",
      };
    }
  }, [projectContext]);

  // Handle a user message while in Guided Design mode.
  // Returns true so the caller does NOT run the normal AI pipeline.
  // Handles both 'asking' (first reply) and 'awaiting_confirmation' (adding more).
  const handleGuidedDesignMessage = useCallback(
    async (userMessage: string): Promise<boolean> => {
      if (
        isEvaluating ||
        queue.length === 0 ||
        (guidedDesignState !== "asking" && guidedDesignState !== "awaiting_confirmation")
      ) {
        return false;
      }

      const currentQuestion = queue[currentIndex];
      const combinedAnswer = pendingAnswer ? `${pendingAnswer}\n\n${userMessage}` : userMessage;
      const currentHistory = [...messages, { role: "user", content: userMessage } as ChatMessage];

      setIsEvaluating(true);
      try {
        const evaluation = await evaluateAndRespond(combinedAnswer, currentQuestion, currentHistory);
        if (evaluation.type === "error") {
          toast({
            title: "Error",
            description: evaluation.error,
            variant: "destructive",
          });
          return true;
        }

        onAddMessages([{ role: "assistant", content: evaluation.reply, timestamp: new Date() }]);
        setPendingAnswer(combinedAnswer);
        setGuidedDesignState(evaluation.type === "complete" ? "awaiting_confirmation" : "asking");
      } finally {
        setIsEvaluating(false);
      }

      return true;
    },
    [guidedDesignState, isEvaluating, queue, currentIndex, onAddMessages, evaluateAndRespond, pendingAnswer, messages]
  );

  // Helper to save current answer
  const saveCurrentAnswer = useCallback(async (question: GuidedDesignQuestion, answer: string) => {
    try {
      const fields = getQuestionFields(question.phaseId, question.stepId, question.activityId);
      const fieldKey = fields.length > 0 ? fields[0].id : "response";
      const dataToSave = { [fieldKey]: answer };

      await saveActivityResponse(
        projectId,
        question.phaseId,
        question.stepId,
        question.activityId,
        dataToSave
      );
      debugLog(
        `[useGuidedDesign] Saved answer for ${question.phaseId}/${question.stepId}/${question.activityId} as { ${fieldKey}: ... }`
      );

      // Dispatch global event for other components to sync
      const event = new CustomEvent('activity_saved', {
        detail: {
          phaseId: question.phaseId,
          stepId: question.stepId,
          activityId: question.activityId
        }
      });
      window.dispatchEvent(event);

      // Trigger the success callback so the parent can refresh project context
      onActivitySaved?.();
      return true;
    } catch (err) {
      debugError("[useGuidedDesign] Error saving answer:", err);
      return false;
    }
  }, [projectId, onActivitySaved]);

  // Confirm moving to the next question
  const confirmNext = useCallback(async () => {
    if (!pendingAnswer || guidedDesignState !== "awaiting_confirmation") return;

    const currentQuestion = queue[currentIndex];
    setGuidedDesignState("saving");

    await saveCurrentAnswer(currentQuestion, pendingAnswer);

    const nextIndex = currentIndex + 1;

    if (nextIndex >= queue.length) {
      onAddMessages([
        {
          role: "assistant",
          content:
            "Guided Design complete! All your answers have been saved. You can revisit and edit them any time in the Context and Define activity tabs.",
          timestamp: new Date(),
        },
      ]);
      setPendingAnswer(null);
      setGuidedDesignState("complete");
      return;
    }

    setCurrentIndex(nextIndex);
    setPendingAnswer(null);
    setGuidedDesignState("asking");
    askQuestion(queue[nextIndex], queue.length, nextIndex);
  }, [
    pendingAnswer,
    guidedDesignState,
    queue,
    currentIndex,
    saveCurrentAnswer,
    onAddMessages,
    askQuestion,
  ]);

  // "Pause design" — exit the session at the current point
  const stopGuidedDesign = useCallback(async () => {
    // We intentionally DO NOT auto-save here anymore if the answer is partial/unconfirmed.
    // We also do not clear the pendingAnswer, so it can be resumed.
    setGuidedDesignState("paused");

    onAddMessages([
      {
        role: "assistant",
        content: "Guided Design session paused. You can resume any time by clicking **Resume design**, and your progress is kept.",
        timestamp: new Date(),
      },
    ]);
  }, [onAddMessages]);

  const resetGuidedDesign = useCallback(() => {
    setGuidedDesignState("idle");
    setQueue([]);
    setCurrentIndex(0);
    setPendingAnswer(null);
    setIsEvaluating(false);
  }, []);

  const isActive =
    guidedDesignState === "asking" ||
    guidedDesignState === "awaiting_confirmation" ||
    guidedDesignState === "saving" ||
    guidedDesignState === "loading_questions";

  return {
    guidedDesignState,
    isActive,
    isEvaluating,
    currentQuestion: queue[currentIndex] ?? null,
    totalQuestions: queue.length,
    currentIndex,
    startGuidedDesign,
    handleGuidedDesignMessage,
    confirmNext,
    stopGuidedDesign,
    resetGuidedDesign,
  };
};
