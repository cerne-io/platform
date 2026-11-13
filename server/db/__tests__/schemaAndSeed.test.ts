// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PGlite } from "@electric-sql/pglite";
import { initDatabase } from "../migrate.ts";
import { seedDatabase } from "../seed.ts";

const SAMPLE_PROJECT_ID = "10000000-0000-0000-0000-000000000001";
const STARTER_TEMPLATE_ID = "10000000-0000-0000-0000-000000000002";
const SAMPLE_FORM_ID = "sample-onboarding-form";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(currentDir, "..", "schema.sql");

describe("PGlite distilled schema & first-boot seed", () => {
  const openDbs: PGlite[] = [];

  afterEach(async () => {
    while (openDbs.length > 0) {
      const db = openDbs.pop();
      await db?.close();
    }
  });

  async function bootFresh(seedSampleProject = true): Promise<PGlite> {
    const db = await initDatabase(undefined, { seedSampleProject });
    openDbs.push(db);
    return db;
  }

  it("initializes schema and seeds idempotently without overwriting edited prompts", async () => {
    const db = await bootFresh(true);

    // Simulate user editing a prompt in Workspace Settings (Phase 5)
    await db.query(
      `UPDATE public.ai_prompts SET content = 'Custom edited prompt' WHERE prompt_key = 'translation_system'`
    );

    // Re-apply schema.sql + seedDatabase() to simulate container reboot
    const schemaSql = readFileSync(schemaPath, "utf8");
    await db.exec(schemaSql);
    await seedDatabase(db, { seedSampleProject: true });

    const promptsRes = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM public.ai_prompts`
    );
    expect(Number(promptsRes.rows[0].count)).toBe(18);

    const editedRes = await db.query<{ content: string }>(
      `SELECT content FROM public.ai_prompts WHERE prompt_key = 'translation_system'`
    );
    expect(editedRes.rows[0].content).toBe("Custom edited prompt");

    const projectsRes = await db.query<{
      id: string;
      is_template: boolean;
      lifetime_stories_collected: number;
    }>(
      `SELECT id, is_template, lifetime_stories_collected FROM public.projects ORDER BY id`
    );
    expect(projectsRes.rows).toEqual([
      { id: SAMPLE_PROJECT_ID, is_template: false, lifetime_stories_collected: 6 },
      { id: STARTER_TEMPLATE_ID, is_template: true, lifetime_stories_collected: 2 },
    ]);

    const statsRes = await db.query<{ project_id: string; stories_count: string }>(
      `SELECT project_id, stories_count::text AS stories_count FROM public.project_story_stats ORDER BY project_id`
    );
    expect(statsRes.rows).toEqual([
      { project_id: SAMPLE_PROJECT_ID, stories_count: "6" },
      { project_id: STARTER_TEMPLATE_ID, stories_count: "2" },
    ]);
  });

  it("skips sample project creation when seedSampleProject is false", async () => {
    const db = await bootFresh(false);

    const promptsRes = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM public.ai_prompts`
    );
    expect(Number(promptsRes.rows[0].count)).toBe(18);

    const projectsRes = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM public.projects`
    );
    expect(Number(projectsRes.rows[0].count)).toBe(0);
  });

  it("handles activity, template, and completion RPCs", async () => {
    const db = await bootFresh(true);

    // insert_activity_response & fetch_activity_response
    await db.query(
      `SELECT public.insert_activity_response($1, 'define', 'topic', 'notes', '{"text": "v1"}'::jsonb)`,
      [SAMPLE_PROJECT_ID]
    );
    await db.query(
      `SELECT public.insert_activity_response($1, 'define', 'topic', 'notes', '{"text": "v2"}'::jsonb)`,
      [SAMPLE_PROJECT_ID]
    );
    const fetched = await db.query<{ res: { found: boolean; data?: { ar_response: { text: string } } } }>(
      `SELECT public.fetch_activity_response($1, 'define', 'topic', 'notes') AS res`,
      [SAMPLE_PROJECT_ID]
    );
    expect(fetched.rows[0].res.found).toBe(true);
    expect(fetched.rows[0].res.data?.ar_response.text).toBe("v2");

    const missing = await db.query<{ res: { found: boolean } }>(
      `SELECT public.fetch_activity_response($1, 'define', 'topic', 'missing') AS res`,
      [SAMPLE_PROJECT_ID]
    );
    expect(missing.rows[0].res.found).toBe(false);

    // save_template_activity_response & fetch_template_activity_response
    await db.query(
      `SELECT public.save_template_activity_response($1, 'define', 'discover', 'factors', '["Trust"]'::jsonb)`,
      [STARTER_TEMPLATE_ID]
    );
    const tplFetched = await db.query<{ res: { found: boolean; data?: { ar_response: string[] } } }>(
      `SELECT public.fetch_template_activity_response($1, 'define', 'discover', 'factors') AS res`,
      [STARTER_TEMPLATE_ID]
    );
    expect(tplFetched.rows[0].res.found).toBe(true);
    expect(tplFetched.rows[0].res.data?.ar_response).toEqual(["Trust"]);

    // copy_template_to_user
    const cloned = await db.query<{ new_project_id: string; story_mapping: Record<string, string> }>(
      `SELECT * FROM public.copy_template_to_user($1, 'Cloned Listening Project')`,
      [STARTER_TEMPLATE_ID]
    );
    const newId = cloned.rows[0].new_project_id;
    expect(newId).toBeTruthy();
    expect(Object.keys(cloned.rows[0].story_mapping)).toHaveLength(2);

    const clonedStories = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM public.stories WHERE st_project_id = $1`,
      [newId]
    );
    expect(Number(clonedStories.rows[0].count)).toBe(2);

    const clonedActivities = await db.query<{ ar_activity_id: string }>(
      `SELECT ar_activity_id FROM public.activity_responses WHERE ar_project_id = $1`,
      [newId]
    );
    const clonedActivityIds = clonedActivities.rows.map((r) => r.ar_activity_id);
    expect(clonedActivityIds).toContain("story-questions");
    expect(clonedActivityIds).toContain("form-builder-questions");
    expect(clonedActivityIds).toContain("participant-questions");
    expect(clonedActivityIds).toContain("form-languages");

    // Seeded sample activity_responses match frontend form/builder object expectations
    const sampleFactors = await db.query<{ res: { found: boolean; data?: { ar_response: Record<string, unknown> } } }>(
      `SELECT public.fetch_activity_response($1, 'define', 'discover', 'factors') AS res`,
      [SAMPLE_PROJECT_ID]
    );
    expect(typeof sampleFactors.rows[0].res.data?.ar_response.factors_description).toBe("string");

    const sampleBuilder = await db.query<{ res: { found: boolean; data?: { ar_response: unknown[] } } }>(
      `SELECT public.fetch_activity_response($1, 'design', 'form-builder', 'form-builder-questions') AS res`,
      [SAMPLE_PROJECT_ID]
    );
    expect(Array.isArray(sampleBuilder.rows[0].res.data?.ar_response)).toBe(true);
    expect(sampleBuilder.rows[0].res.data?.ar_response.length).toBeGreaterThanOrEqual(7);

    // mark_activity_completed & is_activity_completed
    const beforeComplete = await db.query<{ done: boolean }>(
      `SELECT public.is_activity_completed($1, 'design', 'questions', 'story-question') AS done`,
      [newId]
    );
    expect(beforeComplete.rows[0].done).toBe(false);

    await db.query(
      `SELECT public.mark_activity_completed($1, 'design', 'questions', 'story-question')`,
      [newId]
    );
    const afterComplete = await db.query<{ done: boolean }>(
      `SELECT public.is_activity_completed($1, 'design', 'questions', 'story-question') AS done`,
      [newId]
    );
    expect(afterComplete.rows[0].done).toBe(true);
  });

  it("handles public form validation, branding, and schedule expiry", async () => {
    const db = await bootFresh(true);

    const hasForm = await db.query<{ ok: boolean }>(
      `SELECT public.has_public_form_id($1) AS ok`,
      [SAMPLE_PROJECT_ID]
    );
    expect(hasForm.rows[0].ok).toBe(true);

    const resolved = await db.query<{ id: string | null }>(
      `SELECT public.get_project_id_by_form_id($1) AS id`,
      [SAMPLE_FORM_ID]
    );
    expect(resolved.rows[0].id).toBe(SAMPLE_PROJECT_ID);

    const formConfig = await db.query<{ ar_activity_id: string }>(
      `SELECT ar_activity_id FROM public.get_public_form_config($1)`,
      [SAMPLE_FORM_ID]
    );
    expect(formConfig.rows.length).toBeGreaterThanOrEqual(8);

    // Expired form window returns NULL and empty config
    await db.query(
      `UPDATE public.form_identifiers SET end_date = now() - interval '1 day' WHERE form_id = $1`,
      [SAMPLE_FORM_ID]
    );
    const expiredResolved = await db.query<{ id: string | null }>(
      `SELECT public.get_project_id_by_form_id($1) AS id`,
      [SAMPLE_FORM_ID]
    );
    expect(expiredResolved.rows[0].id).toBeNull();
  });

  it("creates dashboard tokens and returns live public dashboard payloads", async () => {
    const db = await bootFresh(true);
    const rawToken = "test-share-token-abc123";

    const created = await db.query<{ id: string; public_slug: string }>(
      `SELECT * FROM public.create_dashboard_token($1, $2)`,
      [SAMPLE_PROJECT_ID, rawToken]
    );
    expect(created.rows[0].id).toBeTruthy();
    expect(created.rows[0].public_slug).toHaveLength(12);

    const tokensList = await db.query<{ tokens: Array<{ id: string; token: string }> }>(
      `SELECT public.get_project_dashboard_tokens($1) AS tokens`,
      [SAMPLE_PROJECT_ID]
    );
    expect(tokensList.rows[0].tokens).toHaveLength(1);
    expect(tokensList.rows[0].tokens[0].token).toBe(rawToken);

    const validated = await db.query<{ project_id: string | null }>(
      `SELECT public.validate_dashboard_token($1) AS project_id`,
      [rawToken]
    );
    expect(validated.rows[0].project_id).toBe(SAMPLE_PROJECT_ID);

    await db.query(
      `INSERT INTO public.dashboard_observations (project_id, question_id, observations, hypotheses)
       VALUES ($1, 'triangle-1', '["Obs A"]'::jsonb, '["Hyp A"]'::jsonb)`,
      [SAMPLE_PROJECT_ID]
    );

    const dashboard = await db.query<{
      payload: {
        project: { id: string; name: string };
        questionType: string;
        customBranding: Record<string, unknown>;
        savedComparisons: Array<{ name: string }>;
        formConfig: unknown[];
        observations: Array<{ question_id: string; observations: string[] }>;
        stories: Array<{
          id: string;
          title: string;
          feeling: string;
          sliderResponses: unknown[];
          triangleResponses: unknown[];
          participantResponses: unknown[];
        }>;
      } | null;
    }>(`SELECT public.get_public_dashboard_data($1) AS payload`, [rawToken]);

    const payload = dashboard.rows[0].payload;
    expect(payload).not.toBeNull();
    expect(payload?.project.id).toBe(SAMPLE_PROJECT_ID);
    expect(payload?.questionType).toBe("both");
    expect(payload?.customBranding).toEqual({});
    expect(payload?.savedComparisons).toHaveLength(1);
    expect(payload?.formConfig.length).toBeGreaterThanOrEqual(8);
    expect(payload?.observations[0].question_id).toBe("triangle-1");
    expect(payload?.observations[0].observations).toEqual(["Obs A"]);
    expect(payload?.stories).toHaveLength(6);
    expect(payload?.stories[0].sliderResponses).toHaveLength(3);
    expect(payload?.stories[0].triangleResponses).toHaveLength(2);
    expect(payload?.stories[0].participantResponses).toHaveLength(2);
    expect(payload?.stories[0]).not.toHaveProperty("user_id");

    // show_pattern_insights = false hides observations
    await db.query(`UPDATE public.dashboard_tokens SET show_pattern_insights = false WHERE id = $1`, [
      created.rows[0].id,
    ]);
    const hiddenObs = await db.query<{ payload: { observations: unknown[] } | null }>(
      `SELECT public.get_public_dashboard_data($1) AS payload`,
      [rawToken]
    );
    expect(hiddenObs.rows[0].payload?.observations).toEqual([]);

    // Archiving project blocks validate_dashboard_token, get_public_dashboard_data, and public form RPCs
    await db.query(`UPDATE public.projects SET is_archived = true WHERE id = $1`, [
      SAMPLE_PROJECT_ID,
    ]);
    const archivedToken = await db.query<{ pid: string | null }>(
      `SELECT public.validate_dashboard_token($1) AS pid`,
      [rawToken]
    );
    expect(archivedToken.rows[0].pid).toBeNull();
    const archivedDashboard = await db.query<{ payload: unknown }>(
      `SELECT public.get_public_dashboard_data($1) AS payload`,
      [rawToken]
    );
    expect(archivedDashboard.rows[0].payload).toBeNull();
    const archivedForm = await db.query<{ ok: boolean }>(
      `SELECT public.has_public_form_id($1) AS ok`,
      [SAMPLE_PROJECT_ID]
    );
    expect(archivedForm.rows[0].ok).toBe(false);
    await db.query(`UPDATE public.projects SET is_archived = false WHERE id = $1`, [
      SAMPLE_PROJECT_ID,
    ]);

    // Revoking token blocks access
    await db.query(`UPDATE public.dashboard_tokens SET is_active = false WHERE id = $1`, [
      created.rows[0].id,
    ]);
    const revokedDashboard = await db.query<{ payload: unknown }>(
      `SELECT public.get_public_dashboard_data($1) AS payload`,
      [rawToken]
    );
    expect(revokedDashboard.rows[0].payload).toBeNull();
  });

  it("deletes stories with all responses and cascades full project deletion", async () => {
    const db = await bootFresh(true);
    const storyId = "20000000-0000-0000-0000-000000000001";

    const storyDelete = await db.query<{
      res: {
        success: boolean;
        slider_responses_deleted: number;
        participant_responses_deleted: number;
        triangle_responses_deleted: number;
      };
    }>(`SELECT public.delete_story_with_responses($1) AS res`, [storyId]);

    expect(storyDelete.rows[0].res).toEqual({
      success: true,
      slider_responses_deleted: 3,
      participant_responses_deleted: 2,
      triangle_responses_deleted: 2,
      story_id: storyId,
    });

    const projectDelete = await db.query<{ ok: boolean }>(
      `SELECT public.delete_project($1) AS ok`,
      [SAMPLE_PROJECT_ID]
    );
    expect(projectDelete.rows[0].ok).toBe(true);

    const remainingStories = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM public.stories WHERE st_project_id = $1`,
      [SAMPLE_PROJECT_ID]
    );
    expect(Number(remainingStories.rows[0].count)).toBe(0);
  });
});
