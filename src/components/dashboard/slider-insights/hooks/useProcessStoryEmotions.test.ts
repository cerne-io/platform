import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useProcessStoryEmotions } from "./useProcessStoryEmotions";
import { sentimentService } from "@/services/sentimentService";
import type { Story } from "@/types/story";

describe("useProcessStoryEmotions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses existing feelingSentiment on public dashboards without calling /api/ai/sentiment", async () => {
    const batchSpy = vi.spyOn(sentimentService, "getBatchSentiments").mockResolvedValue(new Map());

    const stories = [
      { id: "s1", title: "T1", text: "Body 1", feeling: "Encouraged", feelingSentiment: "positive" },
      { id: "s2", title: "T2", text: "Body 2", feeling: "Frustrated" },
      { id: "s3", title: "T3", text: "Body 3", feeling: "CustomUncachedWord" },
    ] as unknown as Story[];

    const { result } = renderHook(() =>
      useProcessStoryEmotions(stories, true, "proj-1", true)
    );

    await waitFor(() => {
      expect(result.current.processingComplete).toBe(true);
    });

    expect(result.current.processedStories.s1).toBe("positive");
    expect(result.current.processedStories.s2).toBe("negative");
    expect(batchSpy).not.toHaveBeenCalled();
  });
});

