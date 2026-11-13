import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { deleteStory } from "./deleteStory";

// ---------------------------------------------------------------------------
// Mock @/integrations/supabase/client
// vi.hoisted ensures the mock variable is available when vi.mock is hoisted
// ---------------------------------------------------------------------------
const { mockFrom, mockRpc, mockGetUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------



const STORY_ID = "story-123";
const USER_ID = "user-abc";

const OWNED_STORY = {
  id: STORY_ID,
  st_project_id: "project-1",
  projects: { user_id: USER_ID },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("deleteStory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Auth guard ────────────────────────────────────────────────────────────

  it("returns false when no authenticated user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const result = await deleteStory(STORY_ID);

    expect(result).toBe(false);
  });

  // ── Ownership checks ──────────────────────────────────────────────────────

  it("returns false when story ownership check fails with an error", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: USER_ID } } });

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      }),
    });

    const result = await deleteStory(STORY_ID);

    expect(result).toBe(false);
  });

  it("returns false when story is not found", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: USER_ID } } });

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const result = await deleteStory(STORY_ID);

    expect(result).toBe(false);
  });

  it("returns false when story lookup errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: USER_ID } } });

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      }),
    });

    const result = await deleteStory(STORY_ID);

    expect(result).toBe(false);
  });

  // ── DB function success path ───────────────────────────────────────────────

  it("returns true when the RPC delete_story_with_responses succeeds", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: USER_ID } } });

    // Story ownership check
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: OWNED_STORY, error: null }),
    });

    // RPC succeeds
    mockRpc.mockResolvedValueOnce({ error: null });

    const result = await deleteStory(STORY_ID);

    expect(result).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("delete_story_with_responses", {
      story_id_param: STORY_ID,
    });
  });

  // ── Manual deletion fallback ──────────────────────────────────────────────

  it("falls back to manual deletion when RPC fails and returns true on clean manual delete", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: USER_ID } } });

    // Ownership check
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: OWNED_STORY, error: null }),
      })
      // Manual: stories delete (cascades child responses via FK)
      .mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      // Verification query
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

    // RPC fails
    mockRpc.mockResolvedValueOnce({ error: { message: "Function not found" } });

    const result = await deleteStory(STORY_ID);

    expect(result).toBe(true);
  });

  it("converts numeric storyId to string before querying", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: USER_ID } } });

    const eqMock = vi.fn().mockReturnThis();
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: eqMock,
      maybeSingle: maybeSingleMock,
    });

    await deleteStory(42);

    expect(eqMock).toHaveBeenCalledWith("id", "42");
  });
});
