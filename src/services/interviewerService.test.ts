import { describe, it, expect, vi, beforeEach } from "vitest";
import { interviewerService } from "./interviewerService";

const { mockPostAi } = vi.hoisted(() => ({ mockPostAi: vi.fn() }));

vi.mock("@/lib/localClient", () => ({
  postAiEndpoint: mockPostAi,
}));

const baseRequest = {
  prompt: "Tell me a story",
};

/** Build a FunctionsHttpError-like object with an optional parseable JSON body */
function makeEdgeFunctionError(message: string, bodyJson?: Record<string, unknown>) {
  return {
    message,
    context: bodyJson
      ? {
          json: async () => bodyJson,
        }
      : undefined,
  };
}

describe("interviewerService.callInterviewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the response text on success", async () => {
    mockPostAi.mockResolvedValueOnce({
      data: { response: "Hello from AI" },
      error: null,
    });

    const result = await interviewerService.callInterviewer(baseRequest);

    expect(result.response).toBe("Hello from AI");
    expect(result.error).toBeNull();
    expect(result.errorCode).toBeNull();
    expect(mockPostAi).toHaveBeenCalledWith(
      "/api/ai/interviewer",
      expect.objectContaining({ prompt: "Tell me a story" }),
      { skipUnauthorizedLock: false }
    );
  });

  it("returns skipped: true cleanly when server skips AI probe", async () => {
    mockPostAi.mockResolvedValueOnce({
      data: { response: null, skipped: true, reason: "disabled" },
      error: null,
    });

    const result = await interviewerService.callInterviewer({
      ...baseRequest,
      formId: "form-123",
    });

    expect(result.response).toBeNull();
    expect(result.skipped).toBe(true);
    expect(result.error).toBeNull();
    expect(mockPostAi).toHaveBeenCalledWith(
      "/api/ai/interviewer",
      expect.objectContaining({ formId: "form-123" }),
      { skipUnauthorizedLock: true }
    );
  });

  it("returns the raw error message when endpoint returns an error without a parseable body", async () => {
    const error = makeEdgeFunctionError("Service Unavailable");

    mockPostAi.mockResolvedValueOnce({ data: null, error });

    const result = await interviewerService.callInterviewer(baseRequest);

    expect(result.response).toBeNull();
    expect(result.error).toBe("Service Unavailable");
    expect(result.errorCode).toBeNull();
  });

  it("extracts detailed error and errorCode from parseable JSON body (parseEdgeFunctionError path)", async () => {
    const error = makeEdgeFunctionError("Edge function error", {
      error: "Account limit reached",
      errorCode: "LIMIT_EXCEEDED",
    });

    mockPostAi.mockResolvedValueOnce({ data: null, error });

    const result = await interviewerService.callInterviewer(baseRequest);

    expect(result.response).toBeNull();
    expect(result.error).toBe("Account limit reached");
    expect(result.errorCode).toBe("LIMIT_EXCEEDED");
  });

  it("falls back to the raw message when JSON body has no error field", async () => {
    const error = makeEdgeFunctionError("Raw fallback message", {
      someOtherField: "unrelated",
    });

    mockPostAi.mockResolvedValueOnce({ data: null, error });

    const result = await interviewerService.callInterviewer(baseRequest);

    expect(result.response).toBeNull();
    expect(result.error).toBe("Raw fallback message");
    expect(result.errorCode).toBeNull();
  });

  it("handles malformed context.json gracefully (swallows JSON parse error)", async () => {
    const error = {
      message: "Parse failure message",
      context: {
        json: async () => {
          throw new Error("Invalid JSON");
        },
      },
    };

    mockPostAi.mockResolvedValueOnce({ data: null, error });

    const result = await interviewerService.callInterviewer(baseRequest);

    expect(result.response).toBeNull();
    expect(result.error).toBe("Parse failure message");
  });

  it("returns error when endpoint responds with data.error", async () => {
    mockPostAi.mockResolvedValueOnce({
      data: { error: "Provider not configured", errorCode: "MISSING_PROVIDER" },
      error: null,
    });

    const result = await interviewerService.callInterviewer(baseRequest);

    expect(result.response).toBeNull();
    expect(result.error).toBe("Provider not configured");
    expect(result.errorCode).toBe("MISSING_PROVIDER");
  });

  it("returns error when data is present but response field is missing", async () => {
    mockPostAi.mockResolvedValueOnce({
      data: { someField: "unexpected" },
      error: null,
    });

    const result = await interviewerService.callInterviewer(baseRequest);

    expect(result.response).toBeNull();
    expect(result.error).toBe("Received invalid response from interviewer AI");
  });

  it("returns error when data is null", async () => {
    mockPostAi.mockResolvedValueOnce({ data: null, error: null });

    const result = await interviewerService.callInterviewer(baseRequest);

    expect(result.response).toBeNull();
    expect(result.error).toBe("Received invalid response from interviewer AI");
  });

  it("catches unexpected thrown errors and returns them as a string", async () => {
    mockPostAi.mockRejectedValueOnce(new Error("Network timeout"));

    const result = await interviewerService.callInterviewer(baseRequest);

    expect(result.response).toBeNull();
    expect(result.error).toBe("Network timeout");
  });

  it("handles non-Error thrown values", async () => {
    mockPostAi.mockRejectedValueOnce("plain string rejection");

    const result = await interviewerService.callInterviewer(baseRequest);

    expect(result.response).toBeNull();
    expect(result.error).toBe("plain string rejection");
  });
});
