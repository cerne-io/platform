import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, createLocalClient, LOCAL_ADMIN_USER } from "../localClient";

describe("localClient", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  it("serializes structured select, filter, comma order, range, count, and head queries", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: null, count: 12, error: null }), {
        status: 200,
      })
    );

    const client = createLocalClient();
    const res = await client
      .from("ai_prompts")
      .select("id, title", { count: "exact", head: true })
      .eq("category", "design")
      .neq("prompt_key", "old")
      .in("version", [1, 2])
      .is("description", null)
      .gte("version", 1)
      .lte("version", 5)
      .order("category, title", { ascending: true })
      .range(0, 9);

    expect(res).toEqual({ data: null, count: 12, error: null });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/db/query");
    expect(init.credentials).toBe("same-origin");
    expect(JSON.parse(String(init.body))).toEqual({
      table: "ai_prompts",
      action: "select",
      columns: "id, title",
      count: "exact",
      head: true,
      filters: [
        { op: "eq", column: "category", value: "design" },
        { op: "neq", column: "prompt_key", value: "old" },
        { op: "in", column: "version", value: [1, 2] },
        { op: "is", column: "description", value: null },
        { op: "gte", column: "version", value: 1 },
        { op: "lte", column: "version", value: 5 },
      ],
      order: [
        { column: "category", ascending: true, nullsFirst: undefined },
        { column: "title", ascending: true, nullsFirst: undefined },
      ],
      range: { from: 0, to: 9 },
    });
  });

  it("supports upsert, returning select().single(), and delete count", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: "obs-1" }, error: null }), {
        status: 200,
      })
    );
    const client = createLocalClient();

    const upsertRes = await client
      .from("dashboard_observations")
      .upsert(
        { project_id: "p1", question_id: "q1", observations: ["a"] },
        { onConflict: "project_id,question_id" }
      )
      .select("id")
      .single();

    expect(upsertRes.data).toEqual({ id: "obs-1" });
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({
      table: "dashboard_observations",
      action: "upsert",
      columns: "id",
      filters: [],
      order: [],
      values: { project_id: "p1", question_id: "q1", observations: ["a"] },
      onConflict: "project_id,question_id",
      returning: true,
      single: true,
    });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ id: "s1" }], count: 1, error: null }), {
        status: 200,
      })
    );
    const deleteRes = await client
      .from("stories")
      .delete()
      .eq("st_project_id", "p1")
      .select("id", { count: "exact" });

    expect(deleteRes).toEqual({ data: [{ id: "s1" }], count: 1, error: null });
  });

  it("supports rpc().maybeSingle() and emits SIGNED_OUT on admin 401 responses", async () => {
    const client = createLocalClient();
    const events: string[] = [];
    client.auth.onAuthStateChange((event) => events.push(event));

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: "proj-123", error: null }), { status: 200 })
    );
    const rpcRes = await client
      .rpc("get_project_id_by_form_id", { p_form_id: "demo-form" })
      .maybeSingle();
    expect(rpcRes).toEqual({ data: "proj-123", error: null });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: null, error: { message: "Workspace locked" } }), {
        status: 401,
      })
    );
    const lockedRes = await client.from("projects").select("*");
    expect(lockedRes.error?.status).toBe(401);
    expect(events).toEqual(["SIGNED_OUT"]);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Workspace locked" }), { status: 401 })
    );
    const aiLockedRes = await apiFetch("/api/ai/assistant", { method: "POST" });
    expect(aiLockedRes.status).toBe(401);
    expect(events).toEqual(["SIGNED_OUT", "SIGNED_OUT"]);
  });

  it("keeps supabasePublic anonymous and never emits SIGNED_OUT on 401", async () => {
    const pubClient = createLocalClient({ isPublic: true });
    const listener = vi.fn();
    pubClient.auth.onAuthStateChange(listener);

    expect((await pubClient.auth.getUser()).data.user).toBeNull();
    expect((await pubClient.auth.getSession()).data.session).toBeNull();

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Locked" }), { status: 401 })
    );
    await pubClient.from("projects").select("*");
    expect(listener).not.toHaveBeenCalled();

    // Admin unlock/status
    const adminClient = createLocalClient();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ passwordRequired: true, unlocked: true }), { status: 200 })
    );
    const userRes = await adminClient.auth.getUser();
    expect(userRes.data.user).toEqual(LOCAL_ADMIN_USER);

    fetchMock.mockResolvedValueOnce(new Response("Bad Gateway", { status: 502 }));
    const offlineStatus = await adminClient.auth.getStatus();
    expect(offlineStatus.serverUnavailable).toBe(true);
  });
});

