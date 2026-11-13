import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGuidedDesign } from "../useGuidedDesign";
import { fetchActivityResponse } from "@/services/supabaseSync/operations";
import { aiAssistantService } from "@/services/aiAssistantService";
import { toast } from "@/components/ui/use-toast";

vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/services/supabaseSync/operations", () => ({
  fetchActivityResponse: vi.fn(),
}));

vi.mock("@/services/supabaseSync/operations/save/saveActivityResponse", () => ({
  saveActivityResponse: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/services/aiAssistantService", () => ({
  aiAssistantService: {
    callAssistant: vi.fn(),
  },
}));

describe("useGuidedDesign promptVariables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(aiAssistantService.callAssistant).mockResolvedValue({
      response: JSON.stringify({ type: "complete", reply: "Got it!" }),
      error: null,
      errorCode: null,
    });
  });

  const setupForActivity = async (targetActivityId: string) => {
    vi.mocked(fetchActivityResponse).mockImplementation(
      async (_projectId, _phaseId, _stepId, activityId) =>
        activityId === targetActivityId ? null : { response: "already answered" }
    );

    const onAddMessages = vi.fn();
    const { result } = renderHook(() =>
      useGuidedDesign({
        projectId: "proj-1",
        projectContext: "Pharma project context",
        messages: [],
        onAddMessages,
      })
    );

    await act(async () => {
      await result.current.startGuidedDesign();
    });

    return result;
  };

  it("sets expectsMultiple='false' and goalCount='1' for Organization > About", async () => {
    const result = await setupForActivity("about");

    await act(async () => {
      await result.current.handleGuidedDesignMessage(
        "It is positioned as the leader on the pharma industry."
      );
    });

    expect(aiAssistantService.callAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        promptKey: "guided_design_evaluation",
        projectContext: "Pharma project context",
        promptVariables: expect.objectContaining({
          phase: "context",
          step: "Organization",
          activity: "About",
          expectsMultiple: "false",
          goalCount: "1",
          question:
            "Talk about your organization. What is it for? What does it do? For whom? How is it positioned?",
        }),
      })
    );
  });

  it("sets expectsMultiple='true' and goalCount='3' for Topic > Actors", async () => {
    const result = await setupForActivity("actors");

    await act(async () => {
      await result.current.handleGuidedDesignMessage("Nurses");
    });

    expect(aiAssistantService.callAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        promptKey: "guided_design_evaluation",
        promptVariables: expect.objectContaining({
          phase: "define",
          step: "Topic",
          activity: "Actors",
          expectsMultiple: "true",
          goalCount: "3",
          question: "Who are the actors that you want to hear from?",
        }),
      })
    );
  });

  it("sets expectsMultiple='true' and goalCount='3' for Discover > Factors", async () => {
    const result = await setupForActivity("factors");

    await act(async () => {
      await result.current.handleGuidedDesignMessage("Leadership\nCulture");
    });

    expect(aiAssistantService.callAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        promptKey: "guided_design_evaluation",
        promptVariables: expect.objectContaining({
          phase: "define",
          step: "Discover",
          activity: "Factors",
          expectsMultiple: "true",
          goalCount: "3",
          question:
            "What factors do you believe influence how people behave or decide around this topic?",
        }),
      })
    );
  });

  it("shows an error toast and skips fallback reply when LLM is not configured", async () => {
    vi.mocked(fetchActivityResponse).mockImplementation(
      async (_projectId, _phaseId, _stepId, activityId) =>
        activityId === "about" ? null : { response: "already answered" }
    );
    vi.mocked(aiAssistantService.callAssistant).mockResolvedValue({
      response: null,
      error: "No LLM API key is configured. Add one in Workspace Settings.",
      errorCode: "api_key_missing",
    });

    const onAddMessages = vi.fn();
    const { result } = renderHook(() =>
      useGuidedDesign({
        projectId: "proj-1",
        projectContext: "Pharma project context",
        messages: [],
        onAddMessages,
      })
    );

    await act(async () => {
      await result.current.startGuidedDesign();
    });

    onAddMessages.mockClear();

    let handled = false;
    await act(async () => {
      handled = await result.current.handleGuidedDesignMessage("We build tools.");
    });

    expect(handled).toBe(true);
    expect(toast).toHaveBeenCalledWith({
      title: "Error",
      description: "No LLM API key is configured. Add one in Workspace Settings.",
      variant: "destructive",
    });
    expect(onAddMessages).not.toHaveBeenCalled();
    expect(result.current.guidedDesignState).toBe("asking");
  });
});
