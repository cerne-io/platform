import type { PGlite } from "@electric-sql/pglite";
import type { Hono } from "hono";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initDatabase } from "../db/migrate.ts";
import { createApp } from "../index.ts";

function extractCookiePair(setCookieHeader: string | null): string {
  if (!setCookieHeader) return "";
  return setCookieHeader.split(";")[0] || "";
}

describe("Phase 3 Hono Server & DB/RPC Adapter", () => {
  const openDbs: PGlite[] = [];

  async function setup(options: Parameters<typeof createApp>[1] = {}): Promise<{
    db: PGlite;
    app: Hono;
    seededProjectId: string;
    seededFormId: string;
  }> {
    const db = await initDatabase(undefined, { seedSampleProject: true });
    openDbs.push(db);
    const app = await createApp(db, {
      isProduction: false,
      ...options,
    });

    const formRes = await db.query<{ fi_project_id: string; form_id: string }>(
      `SELECT fi_project_id, form_id FROM public.form_identifiers LIMIT 1`
    );

    return {
      db,
      app,
      seededProjectId: formRes.rows[0].fi_project_id,
      seededFormId: formRes.rows[0].form_id,
    };
  }

  afterEach(async () => {
    while (openDbs.length > 0) {
      const db = openDbs.pop();
      if (db) await db.close();
    }
  });

  it("serves /api/health and returns JSON 404 for unknown /api/* routes", async () => {
    const { app, db } = await setup();

    const healthRes = await app.request("/api/health");
    expect(healthRes.status).toBe(200);
    expect(await healthRes.json()).toEqual({ status: "ok", database: "pglite" });

    const notFoundRes = await app.request("/api/does-not-exist");
    expect(notFoundRes.status).toBe(404);
    expect(await notFoundRes.json()).toEqual({ error: "Not found" });

    // SPA static serving + fallback while preserving JSON 404 on /api/*
    const tmpDist = mkdtempSync(path.join(process.cwd(), ".tmp-dist-"));
    try {
      mkdirSync(path.join(tmpDist, "assets"), { recursive: true });
      writeFileSync(path.join(tmpDist, "index.html"), "<!DOCTYPE html><html><body>Cerne</body></html>");
      writeFileSync(path.join(tmpDist, "assets", "app.js"), "console.warn('ok');");

      const spaApp = await createApp(db, { isProduction: false, distDir: tmpDist });
      const assetRes = await spaApp.request("/assets/app.js");
      expect(assetRes.status).toBe(200);
      expect(await assetRes.text()).toContain("console.warn");

      const routeRes = await spaApp.request("/projects");
      expect(routeRes.status).toBe(200);
      expect(routeRes.headers.get("cache-control")).toBe("no-store");
      expect(await routeRes.text()).toContain("Cerne");

      const apiNotFound = await spaApp.request("/api/missing-when-spa-enabled");
      expect(apiNotFound.status).toBe(404);
      expect(await apiNotFound.json()).toEqual({ error: "Not found" });
    } finally {
      rmSync(tmpDist, { recursive: true, force: true });
    }
  });

  it("enforces ADMIN_PASSWORD gate, HMAC cookie unlock/logout, and production fail-closed mode", async () => {
    const testSecret = ["demo", "passphrase", "123"].join("-");
    const { app, db } = await setup({ adminPassword: testSecret });

    const initialStatus = await app.request("/api/auth/status");
    expect(initialStatus.status).toBe(200);
    expect(await initialStatus.json()).toEqual({
      passwordRequired: true,
      unlocked: false,
    });

    const lockedDb = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "projects", action: "select" }),
    });
    expect(lockedDb.status).toBe(401);

    const lockedAdminRpc = await app.request("/api/rpc/delete_project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id_param: "00000000-0000-0000-0000-000000000000" }),
    });
    expect(lockedAdminRpc.status).toBe(401);

    const wrongUnlock = await app.request("/api/auth/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong-password" }),
    });
    expect(wrongUnlock.status).toBe(401);

    const goodUnlock = await app.request("/api/auth/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: testSecret }),
    });
    expect(goodUnlock.status).toBe(200);
    const setCookie = goodUnlock.headers.get("set-cookie");
    expect(setCookie).toContain("cerne_admin_session=");
    expect(setCookie).toContain("HttpOnly");

    const cookie = extractCookiePair(setCookie);
    const unlockedDb = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ table: "projects", action: "select" }),
    });
    expect(unlockedDb.status).toBe(200);

    const logoutRes = await app.request("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.headers.get("set-cookie")).toContain("Max-Age=0");

    // Production fail-closed when ADMIN_PASSWORD is omitted
    const prodLockedApp = await createApp(db, {
      adminPassword: "",
      isProduction: true,
      allowUnauthenticatedAdmin: false,
    });
    const prodStatus = await prodLockedApp.request("/api/auth/status");
    expect(await prodStatus.json()).toEqual({
      passwordRequired: true,
      unconfigured: true,
      unlocked: false,
    });
    const prodDb = await prodLockedApp.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "projects", action: "select" }),
    });
    expect(prodDb.status).toBe(401);
    const prodUnlock = await prodLockedApp.request("/api/auth/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "anything" }),
    });
    expect(prodUnlock.status).toBe(503);

    // Explicit opt-out in production allows pass-through
    const prodOpenApp = await createApp(db, {
      adminPassword: "",
      isProduction: true,
      allowUnauthenticatedAdmin: true,
    });
    const openStatus = await prodOpenApp.request("/api/auth/status");
    expect(await openStatus.json()).toEqual({
      passwordRequired: false,
      unlocked: true,
    });
  });

  it("rate limits unlock attempts and respects TRUST_PROXY opt-in", async () => {
    const { db, app: untrustedApp } = await setup({
      adminPassword: "secret-value",
      trustProxy: false,
      rateLimits: { unlockMax: 2, windowMs: 60_000 },
    });

    await untrustedApp.request("/api/auth/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "1.1.1.1" },
      body: JSON.stringify({ password: "bad" }),
    });
    await untrustedApp.request("/api/auth/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "2.2.2.2" },
      body: JSON.stringify({ password: "bad" }),
    });
    // Spoofed header does NOT bypass rate limiter when trustProxy is false
    const thirdRes = await untrustedApp.request("/api/auth/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "3.3.3.3" },
      body: JSON.stringify({ password: "bad" }),
    });
    expect(thirdRes.status).toBe(429);
    expect(thirdRes.headers.get("retry-after")).toBeTruthy();

    const trustedApp = await createApp(db, {
      isProduction: false,
      adminPassword: "secret-value",
      trustProxy: true,
      rateLimits: { unlockMax: 1, windowMs: 60_000 },
    });
    const ipARes = await trustedApp.request("/api/auth/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.0.1" },
      body: JSON.stringify({ password: "bad" }),
    });
    expect(ipARes.status).toBe(401);
    const ipBRes = await trustedApp.request("/api/auth/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.0.2" },
      body: JSON.stringify({ password: "bad" }),
    });
    expect(ipBRes.status).toBe(401);

    // Multi-hop X-Forwarded-For uses rightmost IP so spoofed prefixes cannot bypass rate limit
    const spoofedRetry = await trustedApp.request("/api/auth/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "9.9.9.9, 10.0.0.1" },
      body: JSON.stringify({ password: "bad" }),
    });
    expect(spoofedRetry.status).toBe(429);

    // Spoofed Fly/CF/X-Real-IP headers must not bypass rate limit on non-Fly proxies
    const spoofedHeaderRetry = await trustedApp.request("/api/auth/unlock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Fly-Client-IP": "8.8.8.8",
        "CF-Connecting-IP": "8.8.4.4",
        "X-Real-IP": "7.7.7.7",
        "X-Forwarded-For": "10.0.0.1",
      },
      body: JSON.stringify({ password: "bad" }),
    });
    expect(spoofedHeaderRetry.status).toBe(429);
  });

  it("enforces schema allowlists and executes CRUD, upsert, jsonb, uuid[], and counts via /api/db/query", async () => {
    const { app, seededProjectId } = await setup({ adminPassword: "" });

    const badTable = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "pg_shadow", action: "select" }),
    });
    expect(badTable.status).toBe(400);

    const protoTable = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "constructor", action: "select" }),
    });
    expect(protoTable.status).toBe(400);

    const protoCol = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "projects", action: "select", columns: "toString" }),
    });
    expect(protoCol.status).toBe(400);

    const badCol = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "projects",
        action: "select",
        columns: "id, nonexistent_col",
      }),
    });
    expect(badCol.status).toBe(400);

    const viewWrite = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "project_story_stats",
        action: "delete",
        filters: [{ op: "eq", column: "project_id", value: seededProjectId }],
      }),
    });
    expect(viewWrite.status).toBe(400);

    const unfilteredDelete = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "stories", action: "delete" }),
    });
    expect(unfilteredDelete.status).toBe(400);

    // _system.* secrets in workspace_settings must never be readable or writable
    const sysWrite = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "workspace_settings",
        action: "upsert",
        values: { key: "_system.app_secret", value: "hijack" },
        onConflict: "key",
      }),
    });
    expect(sysWrite.status).toBe(403);

    const settingsRead = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "workspace_settings", action: "select" }),
    });
    const settingsPayload = (await settingsRead.json()) as {
      data: Array<{ key: string }>;
    };
    expect(settingsPayload.data.some((row) => row.key.startsWith("_system."))).toBe(false);

    // Non-system keys like "asystem.flag" must not be hidden by SQL "_" wildcard
    await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "workspace_settings",
        action: "upsert",
        onConflict: "key",
        values: { key: "asystem.flag", value: true },
      }),
    });
    const nonSysRead = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "workspace_settings",
        action: "select",
        filters: [{ op: "eq", column: "key", value: "asystem.flag" }],
      }),
    });
    expect(((await nonSysRead.json()) as { data: Array<{ key: string }> }).data).toHaveLength(1);

    // Plain strings serialize cleanly into jsonb columns (e.g. workspace_settings.value)
    const strSettingWrite = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "workspace_settings",
        action: "upsert",
        onConflict: "key",
        values: { key: "llm_model", value: "gpt-4o-mini" },
        returning: true,
        single: true,
      }),
    });
    expect(strSettingWrite.status).toBe(200);
    expect(((await strSettingWrite.json()) as { data: { value: string } }).data.value).toBe(
      "gpt-4o-mini"
    );

    // Count + head: true on seeded stories
    const headCount = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "stories",
        action: "select",
        columns: "id",
        filters: [{ op: "eq", column: "st_project_id", value: seededProjectId }],
        count: "exact",
        head: true,
      }),
    });
    expect(headCount.status).toBe(200);
    const headJson = (await headCount.json()) as { data: unknown; count: number };
    expect(headJson.data).toBeNull();
    expect(headJson.count).toBeGreaterThan(0);

    // Empty in() filter short-circuits cleanly and respects .single()
    const emptyIn = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "stories",
        action: "select",
        filters: [{ op: "in", column: "id", value: [] }],
      }),
    });
    expect(emptyIn.status).toBe(200);
    expect(await emptyIn.json()).toEqual({ data: [], count: null, error: null });

    const emptyInSingle = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "stories",
        action: "select",
        filters: [{ op: "in", column: "id", value: [] }],
        single: true,
      }),
    });
    expect(emptyInSingle.status).toBe(406);

    // Upsert dashboard_observations with JSONB arrays
    const upsertObs = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "dashboard_observations",
        action: "upsert",
        onConflict: "project_id,question_id",
        values: {
          project_id: seededProjectId,
          question_id: "triangle-1",
          observations: ["First obs", "Second obs"],
          hypotheses: ["First hyp"],
        },
        returning: true,
        single: true,
      }),
    });
    expect(upsertObs.status).toBe(200);
    const obsBody = (await upsertObs.json()) as {
      data: { observations: string[]; hypotheses: string[] };
    };
    expect(obsBody.data.observations).toEqual(["First obs", "Second obs"]);

    // saved_comparisons with uuid[] columns + range/order
    const storiesRes = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "stories",
        action: "select",
        columns: "id",
        filters: [{ op: "eq", column: "st_project_id", value: seededProjectId }],
        order: [{ column: "created_at", ascending: false }],
        range: { from: 0, to: 1 },
      }),
    });
    const storyIds = (
      (await storiesRes.json()) as { data: Array<{ id: string }> }
    ).data.map((r) => r.id);
    expect(storyIds.length).toBe(2);

    const compRes = await app.request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "saved_comparisons",
        action: "insert",
        values: {
          project_id: seededProjectId,
          name: "Night vs Day",
          analysis_type: "triangle",
          primary_question_id: "1",
          group_a_story_ids: [storyIds[0]],
          group_b_story_ids: [storyIds[1]],
          source_snapshot: { sample: true },
        },
        returning: true,
        single: true,
      }),
    });
    expect(compRes.status).toBe(200);
    const compBody = (await compRes.json()) as {
      data: { group_a_story_ids: string[]; source_snapshot: { sample: boolean } };
    };
    expect(compBody.data.group_a_story_ids).toEqual([storyIds[0]]);
    expect(compBody.data.source_snapshot).toEqual({ sample: true });
  });

  it("routes public vs admin RPCs and encrypts dashboard tokens with AES-256-GCM", async () => {
    const adminSecret = "rpc-test-pass";
    const { db, app, seededProjectId, seededFormId } = await setup({
      adminPassword: adminSecret,
    });

    // Public RPCs work without cookie
    const pubFormRes = await app.request("/api/rpc/get_public_form_config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_form_id: seededFormId }),
    });
    expect(pubFormRes.status).toBe(200);
    const pubFormJson = (await pubFormRes.json()) as { data: unknown[]; error: unknown };
    expect(pubFormJson.error).toBeNull();
    expect(Array.isArray(pubFormJson.data)).toBe(true);

    // Unlock to create encrypted dashboard token
    const unlock = await app.request("/api/auth/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminSecret }),
    });
    const cookie = extractCookiePair(unlock.headers.get("set-cookie"));

    const unknownRpc = await app.request("/api/rpc/non_existent_fn", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({}),
    });
    expect(unknownRpc.status).toBe(404);

    // Accepts ISO timestamps with timezone offsets
    const offsetActivityRes = await app.request("/api/rpc/insert_activity_response", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        project_id: seededProjectId,
        phase_id: "design",
        step_id: "questions",
        activity_id: "offset-check",
        response_data: { note: "tz" },
        p_updated_at: "2026-11-11T10:00:00+02:00",
      }),
    });
    expect(offsetActivityRes.status).toBe(200);

    const rawShareToken = "share-token-abc-123";
    const createTokenRes = await app.request("/api/rpc/create_dashboard_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        p_project_id: seededProjectId,
        p_token: rawShareToken,
      }),
    });
    expect(createTokenRes.status).toBe(200);
    const createdJson = (await createTokenRes.json()) as {
      data: Array<{ id: string; public_slug: string }>;
    };
    expect(createdJson.data[0].id).toBeTruthy();

    // Verify stored token_encrypted in DB is AES-256-GCM ciphertext, NOT plaintext
    const storedRow = await db.query<{ token_encrypted: string }>(
      `SELECT token_encrypted FROM public.dashboard_tokens WHERE id = $1::uuid`,
      [createdJson.data[0].id]
    );
    expect(storedRow.rows[0].token_encrypted).toMatch(/^enc:v1:/);
    expect(storedRow.rows[0].token_encrypted).not.toContain(rawShareToken);

    // get_project_dashboard_tokens decrypts back to plaintext
    const listTokensRes = await app.request("/api/rpc/get_project_dashboard_tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ p_project_id: seededProjectId }),
    });
    expect(listTokensRes.status).toBe(200);
    const listed = (await listTokensRes.json()) as {
      data: Array<{ token: string }>;
    };
    expect(listed.data[0].token).toBe(rawShareToken);

    // Public validate_dashboard_token & get_public_dashboard_data still match sha256(rawShareToken)
    const validateRes = await app.request("/api/rpc/validate_dashboard_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token_value: rawShareToken }),
    });
    expect((await validateRes.json()) as { data: string }).toEqual({
      data: seededProjectId,
      error: null,
    });

    const pubDashRes = await app.request("/api/rpc/get_public_dashboard_data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token_value: rawShareToken }),
    });
    expect(pubDashRes.status).toBe(200);
    const pubDashJson = (await pubDashRes.json()) as {
      data: { project: { id: string }; stories: unknown[] };
    };
    expect(pubDashJson.data.project.id).toBe(seededProjectId);
    expect(Array.isArray(pubDashJson.data.stories)).toBe(true);
  });

  it("validates public story submissions transactionally and rolls back on failure", async () => {
    const { db, app, seededProjectId, seededFormId } = await setup({
      adminPassword: "locked",
    });

    // Pre-seed sentiment_cache + count baseline stories
    await db.query(
      `INSERT INTO public.sentiment_cache (emotion_text, sentiment)
       VALUES ('hopeful', 'positive')
       ON CONFLICT (emotion_text) DO NOTHING`
    );
    const beforeProj = await db.query<{ lifetime_stories_collected: number }>(
      `SELECT lifetime_stories_collected FROM public.projects WHERE id = $1::uuid`,
      [seededProjectId]
    );
    const beforeCount = beforeProj.rows[0].lifetime_stories_collected;

    const missingForm = await app.request("/api/public/submit-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId: "non-existent-form",
        title: "A story",
        text: "Story body",
      }),
    });
    expect(missingForm.status).toBe(404);

    // Valid full submission with decimal coords + omitted skipped value
    const submitRes = await app.request("/api/public/submit-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId: seededFormId,
        title: "Public participant story",
        text: "Everything started during the community workshop.",
        emotionalResponse: "Hopeful",
        sliderResponses: [
          {
            questionId: 101,
            questionText: "Decision speed",
            value: 74.6,
            responseType: "answered",
            leftLabel: "Slow",
            rightLabel: "Fast",
          },
          {
            questionId: 102,
            questionText: "Skipped slider",
            responseType: "skipped",
          },
        ],
        triangleResponses: [
          {
            questionId: 201,
            questionText: "Tradeoffs",
            topLabel: "Quality",
            bottomLeftLabel: "Speed",
            bottomRightLabel: "Cost",
            xPosition: 40.4,
            yPosition: 49.7,
            responseType: "answered",
          },
        ],
        participantResponses: [
          {
            questionId: "role",
            questionText: "Your role?",
            response: "Organizer",
          },
        ],
      }),
    });
    expect(submitRes.status).toBe(201);
    const submitJson = (await submitRes.json()) as { storyId: string; projectId: string };
    expect(submitJson.projectId).toBe(seededProjectId);

    const storyCheck = await db.query<{
      feeling_sentiment: string;
      story_source: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT feeling_sentiment, story_source, created_at, updated_at FROM public.stories WHERE id = $1::uuid`,
      [submitJson.storyId]
    );
    expect(storyCheck.rows[0].feeling_sentiment).toBe("positive");
    expect(storyCheck.rows[0].story_source).toBe("public_form");
    expect(storyCheck.rows[0].created_at.toISOString()).toMatch(/T00:00:00\.000Z$/);
    expect(storyCheck.rows[0].updated_at.toISOString()).toMatch(/T00:00:00\.000Z$/);

    const sliderRes = await db.query<{ value: number | null; response_type: string }>(
      `SELECT value, response_type FROM public.slider_responses WHERE story_id = $1::uuid ORDER BY question_id ASC`,
      [submitJson.storyId]
    );
    expect(sliderRes.rows).toEqual([
      { value: 75, response_type: "answered" },
      { value: null, response_type: "skipped" },
    ]);

    const triRes = await db.query<{ x_position: number; y_position: number }>(
      `SELECT x_position, y_position FROM public.triangle_responses WHERE story_id = $1::uuid`,
      [submitJson.storyId]
    );
    expect(triRes.rows[0]).toEqual({ x_position: 40, y_position: 50 });

    const partRes = await db.query<{ response: string }>(
      `SELECT response FROM public.participant_responses WHERE story_id = $1::uuid`,
      [submitJson.storyId]
    );
    expect(partRes.rows[0]?.response).toBe("Organizer");

    const afterProj = await db.query<{ lifetime_stories_collected: number }>(
      `SELECT lifetime_stories_collected FROM public.projects WHERE id = $1::uuid`,
      [seededProjectId]
    );
    expect(afterProj.rows[0].lifetime_stories_collected).toBe(beforeCount + 1);

    // Mid-transaction SQL failure rolls back the inserted story & counter increment
    await db.query(
      `ALTER TABLE public.participant_responses ADD CONSTRAINT test_rollback_guard CHECK (response <> '__FORCE_ROLLBACK__')`
    );
    const rollbackSubmit = await app.request("/api/public/submit-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId: seededFormId,
        title: "Rolled back story",
        text: "Should not persist",
        participantResponses: [
          {
            questionId: "role",
            questionText: "Your role?",
            response: "__FORCE_ROLLBACK__",
          },
        ],
      }),
    });
    expect(rollbackSubmit.status).toBe(400);
    const rolledBackStory = await db.query(
      `SELECT id FROM public.stories WHERE title = 'Rolled back story'`
    );
    expect(rolledBackStory.rows).toHaveLength(0);
    const countAfterRollback = await db.query<{ lifetime_stories_collected: number }>(
      `SELECT lifetime_stories_collected FROM public.projects WHERE id = $1::uuid`,
      [seededProjectId]
    );
    expect(countAfterRollback.rows[0].lifetime_stories_collected).toBe(beforeCount + 1);

    // Closed form returns 403
    await db.query(
      `UPDATE public.form_identifiers SET end_date = now() - interval '1 hour' WHERE form_id = $1`,
      [seededFormId]
    );
    const closedRes = await app.request("/api/public/submit-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId: seededFormId,
        title: "Late submission",
        text: "Body",
      }),
    });
    expect(closedRes.status).toBe(403);

    // Archived project returns 403 even with an otherwise open form_identifiers window
    await db.query(
      `UPDATE public.form_identifiers SET end_date = now() + interval '1 day' WHERE form_id = $1`,
      [seededFormId]
    );
    await db.query(`UPDATE public.projects SET is_archived = true WHERE id = $1::uuid`, [
      seededProjectId,
    ]);
    const archivedRes = await app.request("/api/public/submit-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId: seededFormId,
        title: "Archived submission",
        text: "Body",
      }),
    });
    expect(archivedRes.status).toBe(403);

    // Oversized > 2 MB body on /api/* is rejected with 413 and keeps security headers
    const oversizedRes = await app.request("/api/public/submit-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId: seededFormId,
        title: "Big",
        text: "x".repeat(2 * 1024 * 1024 + 64),
      }),
    });
    expect(oversizedRes.status).toBe(413);
    expect(oversizedRes.headers.get("x-content-type-options")).toBe("nosniff");

    // Negative questionId is rejected with 400 and duplicate questionIds are deduplicated
    const negRes = await app.request("/api/public/submit-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId: seededFormId,
        title: "Neg ID",
        text: "Body",
        sliderResponses: [
          { questionId: -1, questionText: "Q", value: 50, responseType: "answered" },
        ],
      }),
    });
    expect(negRes.status).toBe(400);

    await db.query(`UPDATE public.projects SET is_archived = false WHERE id = $1::uuid`, [
      seededProjectId,
    ]);
    const dupRes = await app.request("/api/public/submit-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId: seededFormId,
        title: "Dup IDs",
        text: "Body",
        sliderResponses: [
          { questionId: 99, questionText: "Q1", value: 10, responseType: "answered" },
          { questionId: 99, questionText: "Q1", value: 90, responseType: "answered" },
        ],
      }),
    });
    expect(dupRes.status).toBe(201);
    const dupJson = (await dupRes.json()) as { storyId: string };
    const dupRows = await db.query<{ value: number }>(
      `SELECT value FROM public.slider_responses WHERE story_id = $1::uuid AND question_id = 99`,
      [dupJson.storyId]
    );
    expect(dupRows.rows).toHaveLength(1);
    expect(dupRows.rows[0].value).toBe(10);
  });

  it("revokes cookies on logout, invalidates on ADMIN_PASSWORD rotation, and blocks same-site CSRF", async () => {
    const db = await initDatabase(undefined, { seedSampleProject: true });
    const app1 = await createApp(db, {
      adminPassword: "password-v1",
      sessionSecret: "shared-secret",
    });

    const unlockRes = await app1.request("/api/auth/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "password-v1" }),
    });
    const cookie = unlockRes.headers.get("set-cookie")?.split(";")[0] ?? "";

    // Same-site CSRF header blocked with 403
    const csrfRes = await app1.request("/api/db/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "Sec-Fetch-Site": "same-site",
      },
      body: JSON.stringify({ table: "projects", action: "select" }),
    });
    expect(csrfRes.status).toBe(403);

    // Unauthenticated mode also blocks cross-origin mutations with 403
    const unauthApp = await createApp(db, {
      adminPassword: "",
      isProduction: true,
      allowUnauthenticatedAdmin: true,
    });
    const unauthCsrfRes = await unauthApp.request("http://localhost:3000/api/db/query", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Origin: "https://evil.example",
        Host: "localhost:3000",
        "Sec-Fetch-Site": "cross-site",
      },
      body: JSON.stringify({ table: "projects", action: "select" }),
    });
    expect(unauthCsrfRes.status).toBe(403);

    // Logout revokes cookie server-side
    const logoutRes = await app1.request("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(logoutRes.status).toBe(200);
    const replayRes = await app1.request("/api/auth/status", {
      headers: { Cookie: cookie },
    });
    expect(((await replayRes.json()) as { unlocked: boolean }).unlocked).toBe(false);

    // Rotating ADMIN_PASSWORD invalidates pre-rotation cookies even with same SESSION_SECRET
    const app2 = await createApp(db, {
      adminPassword: "password-v2",
      sessionSecret: "shared-secret",
    });
    const rotatedReplay = await app2.request("/api/auth/status", {
      headers: { Cookie: cookie },
    });
    expect(((await rotatedReplay.json()) as { unlocked: boolean }).unlocked).toBe(false);
  });

  it("enforces strict decryptSecretValue validation, CSP/no-store headers, and has_audio=false on public submit", async () => {
    const { decryptSecretValue, encryptSecretValue } = await import("../utils/crypto.ts");
    const key = Buffer.alloc(32, 7);
    const valid = encryptSecretValue(key, "secret-token");
    expect(decryptSecretValue(key, valid)).toBe("secret-token");
    expect(() => decryptSecretValue(key, "plaintext")).toThrow("Unsupported encrypted token format");
    expect(() =>
      decryptSecretValue(key, `enc:v1:${"aa".repeat(8)}:${"bb".repeat(16)}:cc`)
    ).toThrow("Invalid encrypted token parameters");
    expect(() =>
      decryptSecretValue(key, `enc:v1:${"aa".repeat(12)}:${"bb".repeat(4)}:cc`)
    ).toThrow("Invalid encrypted token parameters");

    const { app, db, seededFormId } = await setup();
    const healthRes = await app.request("/api/health");
    expect(healthRes.headers.get("cache-control")).toBe("no-store");
    expect(healthRes.headers.get("content-security-policy")).toContain("script-src 'self'");

    const submitRes = await app.request("/api/public/submit-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId: seededFormId,
        title: "Audio Flag Test",
        text: "Story body",
        hasAudio: true,
      }),
    });
    expect(submitRes.status).toBe(201);
    const { storyId } = (await submitRes.json()) as { storyId: string };
    const row = await db.query<{ has_audio: boolean }>(
      "SELECT has_audio FROM public.stories WHERE id = $1",
      [storyId]
    );
    expect(row.rows[0]?.has_audio).toBe(false);
  });

  it("submits authenticated stories atomically via /api/db/submit-story", async () => {
    const { app, db, seededProjectId } = await setup({ adminPassword: "secret" });

    const unauth = await app.request("/api/db/submit-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: seededProjectId, title: "T", text: "B" }),
    });
    expect(unauth.status).toBe(401);

    const unlockRes = await app.request("/api/auth/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "secret" }),
    });
    const cookie = extractCookiePair(unlockRes.headers.get("set-cookie"));

    const okRes = await app.request("/api/db/submit-story", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        projectId: seededProjectId,
        title: "Admin story",
        text: "Collected in session",
        sliderResponses: [{ questionId: 1, questionText: "Pace", value: 40 }],
        triangleResponses: [{ questionId: 2, questionText: "Focus", xPosition: 50, yPosition: 50 }],
        participantResponses: [{ questionId: "role", questionText: "Role", response: "Lead" }],
      }),
    });
    expect(okRes.status).toBe(201);
    const { storyId } = (await okRes.json()) as { storyId: string };
    const sliders = await db.query("SELECT 1 FROM public.slider_responses WHERE story_id = $1", [storyId]);
    const triangles = await db.query("SELECT 1 FROM public.triangle_responses WHERE story_id = $1", [storyId]);
    const parts = await db.query("SELECT 1 FROM public.participant_responses WHERE story_id = $1", [storyId]);
    expect(sliders.rows).toHaveLength(1);
    expect(triangles.rows).toHaveLength(1);
    expect(parts.rows).toHaveLength(1);
  });
});

