import type { PGlite } from "@electric-sql/pglite";
import { Hono } from "hono";
import { z } from "zod";

const MAX_SAFE_INT = 2_147_483_647;

function toSafeIntegerId(id: string | number): number {
  if (typeof id === "number") {
    const intId = Math.floor(id);
    return Math.abs(intId) % MAX_SAFE_INT;
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % MAX_SAFE_INT;
}

function toRoundedInt(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Math.round(value);
}

const sliderSubmissionSchema = z.object({
  questionId: z.union([z.number().int().min(0).max(MAX_SAFE_INT - 1), z.string().trim().min(1).max(120)]),
  questionText: z.string().max(500),
  value: z.number().min(0).max(100).nullable().optional(),
  responseType: z.enum(["answered", "skipped"]).default("answered"),
  leftLabel: z.string().max(100).optional().nullable(),
  rightLabel: z.string().max(100).optional().nullable(),
});

const triangleSubmissionSchema = z.object({
  questionId: z.union([z.number().int().min(0).max(MAX_SAFE_INT - 1), z.string().trim().min(1).max(120)]),
  questionText: z.string().max(500),
  topLabel: z.string().max(100).optional().nullable(),
  bottomLeftLabel: z.string().max(100).optional().nullable(),
  bottomRightLabel: z.string().max(100).optional().nullable(),
  xPosition: z.number().min(0).max(100).nullable().optional(),
  yPosition: z.number().min(0).max(100).nullable().optional(),
  responseType: z.enum(["answered", "skipped"]).default("answered"),
});

const participantSubmissionSchema = z.object({
  questionId: z.string().min(1).max(120),
  questionText: z.string().max(500),
  response: z.string().max(1000),
});

export const storySubmissionFieldsSchema = {
  title: z.string().trim().min(1, "Title is required").max(200),
  text: z.string().max(10_000),
  emotionalResponse: z.string().max(500).optional().nullable(),
  additionalComments: z.string().max(2000).optional().nullable(),
  hasAudio: z.boolean().optional().default(false),
  sliderResponses: z.array(sliderSubmissionSchema).max(100).optional().default([]),
  triangleResponses: z.array(triangleSubmissionSchema).max(100).optional().default([]),
  participantResponses: z.array(participantSubmissionSchema).max(100).optional().default([]),
};

export const publicSubmitStorySchema = z.object({
  formId: z.string().trim().min(1).max(120),
  ...storySubmissionFieldsSchema,
});

export type StorySubmissionFields = z.infer<z.ZodObject<typeof storySubmissionFieldsSchema>>;

type Queryable = Pick<PGlite, "query">;

export type ActiveFormResult =
  | { ok: true; projectId: string }
  | { ok: false; reason: "not_found" | "inactive" | "not_yet_open" | "closed"; message: string };

/**
 * Resolves a public form identifier and verifies its project and schedule window are active.
 */
export async function resolveActiveForm(db: Queryable, formId: string): Promise<ActiveFormResult> {
  const formRes = await db.query<{
    fi_project_id: string;
    start_date: Date | string | null;
    end_date: Date | string | null;
    is_archived: boolean | null;
    is_template: boolean | null;
    expires_at: Date | string | null;
  }>(
    `SELECT fi.fi_project_id, fi.start_date, fi.end_date, p.is_archived, p.is_template, p.expires_at
     FROM public.form_identifiers fi
     JOIN public.projects p ON p.id = fi.fi_project_id
     WHERE fi.form_id = $1
     LIMIT 1`,
    [formId]
  );

  const form = formRes.rows[0];
  if (!form) {
    return { ok: false, reason: "not_found", message: "Public form not found" };
  }

  const nowMs = Date.now();
  if (
    form.is_archived ||
    form.is_template ||
    (form.expires_at && new Date(form.expires_at).getTime() <= nowMs)
  ) {
    return { ok: false, reason: "inactive", message: "This collection form is no longer active" };
  }
  if (form.start_date && new Date(form.start_date).getTime() > nowMs) {
    return { ok: false, reason: "not_yet_open", message: "This collection form is not yet open" };
  }
  if (form.end_date && new Date(form.end_date).getTime() < nowMs) {
    return { ok: false, reason: "closed", message: "This collection form has closed" };
  }

  return { ok: true, projectId: form.fi_project_id };
}

/**
 * Inserts a story and its slider, triangle, and participant responses inside an existing transaction.
 */
export async function insertStoryWithResponses(
  tx: Queryable,
  params: {
    projectId: string;
    formId: string | null;
    userId: string | null;
    isImported: boolean;
    storySource: string | null;
    transcriptionStatus: string;
    createdAt: string | null;
    payload: StorySubmissionFields;
  }
): Promise<{ storyId: string; projectId: string }> {
  const { projectId, formId, userId, isImported, storySource, transcriptionStatus, createdAt, payload } =
    params;

  const trimmedFeeling = payload.emotionalResponse?.trim() || null;
  let cachedSentiment: string | null = null;
  if (trimmedFeeling) {
    const cacheRes = await tx.query<{ sentiment: string }>(
      `SELECT sentiment FROM public.sentiment_cache
       WHERE lower(trim(emotion_text)) = lower($1)
       LIMIT 1`,
      [trimmedFeeling]
    );
    cachedSentiment = cacheRes.rows[0]?.sentiment ?? null;
  }

  const storyInsert = await tx.query<{ id: string }>(
    `INSERT INTO public.stories (
       user_id,
       st_project_id,
       form_id,
       title,
       text,
       emotional_response,
       additional_comments,
       feeling_sentiment,
       is_public,
       is_imported,
       has_audio,
       story_source,
       transcription_status,
       created_at,
       updated_at
     )
     VALUES (
       $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8,
       false, $9, false, $10, $11,
       COALESCE($12::timestamptz, now()),
       COALESCE($12::timestamptz, now())
     )
     RETURNING id`,
    [
      userId,
      projectId,
      formId,
      payload.title,
      payload.text,
      trimmedFeeling,
      payload.additionalComments ?? null,
      cachedSentiment,
      isImported,
      storySource,
      transcriptionStatus,
      createdAt,
    ]
  );

  const storyId = storyInsert.rows[0].id;

  const seenSliders = new Set<number>();
  for (const slider of payload.sliderResponses) {
    const questionId = toSafeIntegerId(slider.questionId);
    if (seenSliders.has(questionId)) continue;
    seenSliders.add(questionId);
    await tx.query(
      `INSERT INTO public.slider_responses (
         story_id, sr_project_id, form_id, question_id, question_text,
         value, response_type, left_label, right_label, created_at
       )
       VALUES ($1::uuid, $2::uuid, $3, $4::integer, $5, $6::integer, $7, $8, $9, COALESCE($10::timestamptz, now()))`,
      [
        storyId,
        projectId,
        formId,
        questionId,
        slider.questionText,
        slider.responseType === "skipped" ? null : toRoundedInt(slider.value),
        slider.responseType,
        slider.leftLabel ?? null,
        slider.rightLabel ?? null,
        createdAt,
      ]
    );
  }

  const seenTriangles = new Set<number>();
  for (const triangle of payload.triangleResponses) {
    const questionId = toSafeIntegerId(triangle.questionId);
    if (seenTriangles.has(questionId)) continue;
    seenTriangles.add(questionId);
    await tx.query(
      `INSERT INTO public.triangle_responses (
         story_id, tr_project_id, form_id, question_id, question_text,
         top_label, bottom_left_label, bottom_right_label,
         x_position, y_position, response_type, created_at
       )
       VALUES ($1::uuid, $2::uuid, $3, $4::integer, $5, $6, $7, $8, $9::integer, $10::integer, $11, COALESCE($12::timestamptz, now()))`,
      [
        storyId,
        projectId,
        formId,
        questionId,
        triangle.questionText,
        triangle.topLabel ?? null,
        triangle.bottomLeftLabel ?? null,
        triangle.bottomRightLabel ?? null,
        triangle.responseType === "skipped" ? null : toRoundedInt(triangle.xPosition),
        triangle.responseType === "skipped" ? null : toRoundedInt(triangle.yPosition),
        triangle.responseType,
        createdAt,
      ]
    );
  }

  const seenParticipants = new Set<string>();
  for (const participant of payload.participantResponses) {
    if (seenParticipants.has(participant.questionId)) continue;
    seenParticipants.add(participant.questionId);
    await tx.query(
      `INSERT INTO public.participant_responses (
         story_id, pr_project_id, form_id, question_id, question_text, response, created_at
       )
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, COALESCE($7::timestamptz, now()))`,
      [
        storyId,
        projectId,
        formId,
        participant.questionId,
        participant.questionText,
        participant.response,
        createdAt,
      ]
    );
  }

  return { storyId, projectId };
}

class FormAccessError extends Error {
  readonly statusCode: 403 | 404;
  constructor(message: string, statusCode: 403 | 404) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function createPublicRoutes(db: PGlite): Hono {
  const router = new Hono();

  router.post("/submit-story", async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const parsed = publicSubmitStorySchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        { error: parsed.error.errors[0]?.message || "Invalid story payload" },
        400
      );
    }

    const payload = parsed.data;

    try {
      const result = await db.transaction(async (tx) => {
        const form = await resolveActiveForm(tx, payload.formId);
        if (!form.ok) {
          throw new FormAccessError(form.message, form.reason === "not_found" ? 404 : 403);
        }

        const now = new Date();
        const anonymizedCreatedAt = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
        ).toISOString();

        return insertStoryWithResponses(tx, {
          projectId: form.projectId,
          formId: payload.formId,
          userId: null,
          isImported: false,
          storySource: "public_form",
          transcriptionStatus: "completed",
          createdAt: anonymizedCreatedAt,
          payload,
        });
      });

      return c.json(result, 201);
    } catch (err) {
      if (err instanceof FormAccessError) {
        return c.json({ error: err.message }, err.statusCode);
      }
      console.error("[public/submit-story] database error:", err);
      return c.json({ error: "Failed to submit story" }, 400);
    }
  });

  return router;
}

