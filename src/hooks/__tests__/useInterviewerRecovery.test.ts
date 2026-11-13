import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInterviewer } from "../useInterviewer";
import { interviewerService } from "@/services/interviewerService";
import { supabase } from "@/integrations/supabase/client";

const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue || key,
    i18n: { exists: () => false },
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "test-user-123" } }, error: null })),
    },
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

vi.mock("@/services/interviewerService", () => ({
  interviewerService: {
    callInterviewer: vi.fn(),
  },
}));

describe("useInterviewer Recovery & AI Bypass Behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("bypasses AI probe on turn 1 network failure and advances to metadata_title without losing user input", async () => {
    const { result } = renderHook(() =>
      useInterviewer({
        storyQuestion: "Please share an experience from your team.",
      })
    );

    // 1. Start interview
    await act(async () => {
      void result.current.startInterview();
      await vi.advanceTimersByTimeAsync(2100);
    });

    // 2. Simulate AI edge function network failure on first user message
    vi.mocked(interviewerService.callInterviewer).mockResolvedValueOnce({
      response: null,
      error: "Failed to fetch",
      errorCode: "network_error",
    });

    let successFirstAttempt: boolean | undefined;
    await act(async () => {
      successFirstAttempt = await result.current.sendMessage("A difficult project deadline.");
      await vi.advanceTimersByTimeAsync(2100);
    });

    // Verify first attempt returned true (bypassed AI gracefully)
    expect(successFirstAttempt).toBe(true);

    // The user's story turn is preserved in messages
    const userMessages = result.current.messages.filter((m) => m.role === "user");
    expect(userMessages.length).toBe(1);
    expect(userMessages[0].content).toBe("A difficult project deadline.");

    // Hook immediately advanced phase to metadata_title
    expect(result.current.currentPhase).toBe("metadata_title");

    // Verify assistant prompted for title and hashtags
    const lastMessage = result.current.messages[result.current.messages.length - 1];
    expect(lastMessage.role).toBe("assistant");
    expect(lastMessage.content).toContain("give your story a short title and some #hashtags");

    // 3. User provides title & hashtags next
    await act(async () => {
      await result.current.sendMessage("Project Phoenix #crunch #teamwork");
      await vi.advanceTimersByTimeAsync(2100);
    });

    expect(result.current.storyTitle).toBe("Project Phoenix #crunch #teamwork");
    expect(result.current.currentPhase).toBe("metadata_emotion");
  });

  it("sets saveError on auth/network failure without infinite loop toasts and provides retrySave", async () => {
    // Mock getUser to fail as offline
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      error: new Error("Failed to fetch"),
    } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

    const { result } = renderHook(() =>
      useInterviewer({
        projectId: "proj-123",
        isPublic: false,
        storyQuestion: "Please share an experience.",
      })
    );

    // Start interview and advance
    await act(async () => {
      void result.current.startInterview();
      await vi.advanceTimersByTimeAsync(2100);
    });

    // Clear start interview toast call count
    mockToast.mockClear();

    // Mock successful AI probe
    vi.mocked(interviewerService.callInterviewer).mockResolvedValueOnce({
      response: "Tell me more.",
      error: null,
      errorCode: null,
    });

    await act(async () => {
      await result.current.sendMessage("Initial story content.");
      await vi.advanceTimersByTimeAsync(2100);
    });

    // Advance to title
    await act(async () => {
      await result.current.sendMessage("Second part of story.");
      await vi.advanceTimersByTimeAsync(2100);
    });

    // Submit title
    await act(async () => {
      await result.current.sendMessage("My Story Title #work");
      await vi.advanceTimersByTimeAsync(2100);
    });

    // Select emotion
    await act(async () => {
      await result.current.handleEmotionSelect("joy");
      await vi.advanceTimersByTimeAsync(2100);
    });

    // Finish additional comments to trigger phase = complete
    await act(async () => {
      await result.current.sendMessage("No further comments.");
      await vi.advanceTimersByTimeAsync(2100);
    });

    expect(result.current.currentPhase).toBe("complete");

    // Let the autoSave effect execute
    await act(async () => {
      await Promise.resolve();
      await vi.runAllTimersAsync();
    });

    // saveError must be set to a user-friendly message, halting any re-trigger loop
    expect(result.current.saveError).toBe("Unable to connect to the server. Please check your internet connection and try again.");
    // Exactly 1 save failure toast should have fired (no infinite flood)
    expect(mockToast).toHaveBeenCalledTimes(1);

    // retrySave resets the saveError to allow re-trying
    act(() => {
      result.current.retrySave();
    });

    expect(result.current.saveError).toBeNull();
  });

  it("blocks early messages during the start delay and cancels the timer on clearInterview", async () => {
    const { result } = renderHook(() =>
      useInterviewer({
        storyQuestion: "Please share an experience from your team.",
      })
    );

    act(() => {
      void result.current.startInterview();
    });

    // Thinking remains active while waiting for the 2s question timer
    expect(result.current.isThinking).toBe(true);

    let sentTooEarly: boolean | undefined;
    await act(async () => {
      sentTooEarly = await result.current.sendMessage("Too early message");
    });
    expect(sentTooEarly).toBe(false);

    // Clearing during the start delay cancels the timer so no orphan question appears later
    act(() => {
      result.current.clearInterview();
    });
    expect(result.current.isThinking).toBe(false);
    expect(result.current.messages).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(result.current.messages).toHaveLength(0);
  });
});
