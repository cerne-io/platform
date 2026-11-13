import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitPublicForm } from "../publicSubmissionHandler";

describe("submitPublicForm", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  it("sends a single transactional request to /api/public/submit-story", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ storyId: "s-1", projectId: "p-1" }), { status: 201 })
    );

    const ok = await submitPublicForm({
      formId: "demo-form",
      title: "<b>My Story</b>",
      text: "Story content",
      emotionalResponse: "Hopeful",
      sliderResponses: [
        {
          questionId: 1,
          questionText: "Speed",
          value: 80,
          responseType: "answered",
          leftLabel: "Slow",
          rightLabel: "Fast",
        },
      ],
      triangleResponses: [
        {
          questionId: 2,
          questionText: "Focus",
          xPosition: 45,
          yPosition: 55,
          responseType: "answered",
          topLabel: "Quality",
          bottomLeftLabel: "Speed",
          bottomRightLabel: "Cost",
        },
      ],
      participantResponses: [
        {
          questionId: "role",
          questionText: "Role",
          choiceText: "Facilitator",
        },
      ],
    });

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/public/submit-story");
    const parsed = JSON.parse(String(init.body)) as {
      formId: string;
      title: string;
      participantResponses: Array<{ response: string }>;
    };
    expect(parsed.formId).toBe("demo-form");
    expect(parsed.title).toBe("My Story");
    expect(parsed.participantResponses[0].response).toBe("Facilitator");
  });

  it("returns false when backend rejects the submission", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Form closed" }), { status: 403 })
    );

    const ok = await submitPublicForm({
      formId: "closed-form",
      title: "Story",
      text: "Body",
      emotionalResponse: "Calm",
    });

    expect(ok).toBe(false);
  });
});

