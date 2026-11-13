import type { PGlite } from "@electric-sql/pglite";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { SYSTEM_SECRET_KEY } from "../utils/crypto.ts";
import { insertStoryWithResponses, storySubmissionFieldsSchema } from "./public.ts";

type ColumnType =
  | "uuid"
  | "text"
  | "boolean"
  | "integer"
  | "timestamptz"
  | "jsonb"
  | "uuid[]"
  | "completion_phase"
  | "completion_step"
  | "completion_activity";

interface TableSpec {
  readonly readOnly?: boolean;
  readonly columns: Readonly<Record<string, ColumnType>>;
}

const SYSTEM_PREFIX = SYSTEM_SECRET_KEY.slice(0, "_system.".length);

const TABLE_SCHEMAS: Readonly<Record<string, TableSpec>> = {
  projects: {
    columns: {
      id: "uuid",
      user_id: "uuid",
      name: "text",
      description: "text",
      created_at: "timestamptz",
      updated_at: "timestamptz",
      is_template: "boolean",
      is_active: "boolean",
      is_archived: "boolean",
      is_event_mode: "boolean",
      activated_at: "timestamptz",
      expires_at: "timestamptz",
      lifetime_stories_collected: "integer",
      topup_story_capacity: "integer",
      last_capacity_alert_at_count: "integer",
    },
  },
  activity_responses: {
    columns: {
      id: "uuid",
      ar_project_id: "uuid",
      ar_phase_id: "text",
      ar_step_id: "text",
      ar_activity_id: "text",
      ar_response: "jsonb",
      created_at: "timestamptz",
      updated_at: "timestamptz",
    },
  },
  template_activity_responses: {
    columns: {
      id: "uuid",
      ar_project_id: "uuid",
      ar_phase_id: "text",
      ar_step_id: "text",
      ar_activity_id: "text",
      ar_response: "jsonb",
      created_at: "timestamptz",
      updated_at: "timestamptz",
    },
  },
  form_identifiers: {
    columns: {
      id: "uuid",
      fi_project_id: "uuid",
      form_id: "text",
      created_at: "timestamptz",
      updated_at: "timestamptz",
      start_date: "timestamptz",
      end_date: "timestamptz",
    },
  },
  stories: {
    columns: {
      id: "uuid",
      user_id: "uuid",
      st_project_id: "uuid",
      title: "text",
      text: "text",
      emotional_response: "text",
      additional_comments: "text",
      created_at: "timestamptz",
      updated_at: "timestamptz",
      is_public: "boolean",
      is_imported: "boolean",
      audio_url: "text",
      has_audio: "boolean",
      form_id: "text",
      feeling_sentiment: "text",
      transcription_status: "text",
      story_source: "text",
    },
  },
  slider_responses: {
    columns: {
      id: "uuid",
      story_id: "uuid",
      question_id: "integer",
      question_text: "text",
      value: "integer",
      left_label: "text",
      right_label: "text",
      created_at: "timestamptz",
      response_type: "text",
      sr_project_id: "uuid",
      form_id: "text",
    },
  },
  triangle_responses: {
    columns: {
      id: "uuid",
      story_id: "uuid",
      question_id: "integer",
      question_text: "text",
      top_label: "text",
      bottom_left_label: "text",
      bottom_right_label: "text",
      x_position: "integer",
      y_position: "integer",
      response_type: "text",
      tr_project_id: "uuid",
      form_id: "text",
      created_at: "timestamptz",
    },
  },
  participant_responses: {
    columns: {
      id: "uuid",
      story_id: "uuid",
      question_id: "text",
      question_text: "text",
      response: "text",
      created_at: "timestamptz",
      pr_project_id: "uuid",
      form_id: "text",
    },
  },
  project_completion_state: {
    columns: {
      id: "uuid",
      project_id: "uuid",
      user_id: "uuid",
      phase: "completion_phase",
      step: "completion_step",
      activity: "completion_activity",
      is_completed: "boolean",
      completed_at: "timestamptz",
      created_at: "timestamptz",
      updated_at: "timestamptz",
    },
  },
  saved_comparisons: {
    columns: {
      id: "uuid",
      project_id: "uuid",
      created_by: "uuid",
      created_at: "timestamptz",
      updated_at: "timestamptz",
      name: "text",
      analysis_type: "text",
      primary_question_id: "text",
      secondary_question_id: "text",
      question_label: "text",
      secondary_question_label: "text",
      group_a_name: "text",
      group_b_name: "text",
      group_a_story_ids: "uuid[]",
      group_b_story_ids: "uuid[]",
      comparison_engine_version: "text",
      source_snapshot: "jsonb",
    },
  },
  dashboard_observations: {
    columns: {
      id: "uuid",
      project_id: "uuid",
      question_id: "text",
      observation_text: "text",
      hypothesis_text: "text",
      created_at: "timestamptz",
      updated_at: "timestamptz",
      observations: "jsonb",
      hypotheses: "jsonb",
    },
  },
  dashboard_tokens: {
    columns: {
      id: "uuid",
      project_id: "uuid",
      is_active: "boolean",
      created_at: "timestamptz",
      created_by: "uuid",
      revoked_at: "timestamptz",
      expires_at: "timestamptz",
      show_pattern_insights: "boolean",
      token_hash: "text",
      token_encrypted: "text",
      public_slug: "text",
    },
  },
  sentiment_cache: {
    columns: {
      id: "uuid",
      emotion_text: "text",
      sentiment: "text",
      created_at: "timestamptz",
      updated_at: "timestamptz",
    },
  },
  ai_prompts: {
    columns: {
      id: "uuid",
      prompt_key: "text",
      title: "text",
      content: "text",
      description: "text",
      category: "text",
      created_at: "timestamptz",
      updated_at: "timestamptz",
      created_by: "uuid",
      version: "integer",
    },
  },
  workspace_settings: {
    columns: {
      key: "text",
      value: "jsonb",
      updated_at: "timestamptz",
    },
  },
  project_story_stats: {
    readOnly: true,
    columns: {
      project_id: "uuid",
      stories_count: "integer",
      last_story_at: "timestamptz",
    },
  },
};

const filterSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("eq"), column: z.string(), value: z.unknown() }),
  z.object({ op: z.literal("neq"), column: z.string(), value: z.unknown() }),
  z.object({ op: z.literal("gte"), column: z.string(), value: z.unknown() }),
  z.object({ op: z.literal("lte"), column: z.string(), value: z.unknown() }),
  z.object({ op: z.literal("in"), column: z.string(), value: z.array(z.unknown()) }),
  z.object({
    op: z.literal("is"),
    column: z.string(),
    value: z.union([z.null(), z.boolean()]),
  }),
]);

const dbQuerySchema = z.object({
  table: z.string().min(1),
  action: z.enum(["select", "insert", "update", "upsert", "delete"]),
  columns: z.string().optional(),
  filters: z.array(filterSchema).optional(),
  order: z
    .array(
      z.object({
        column: z.string().min(1),
        ascending: z.boolean().optional(),
        nullsFirst: z.boolean().optional(),
      })
    )
    .optional(),
  limit: z.number().int().min(1).max(5000).optional(),
  range: z
    .object({
      from: z.number().int().min(0),
      to: z.number().int().min(0),
    })
    .optional(),
  single: z.boolean().optional(),
  maybeSingle: z.boolean().optional(),
  count: z.enum(["exact"]).nullable().optional(),
  head: z.boolean().optional(),
  values: z
    .union([z.record(z.unknown()), z.array(z.record(z.unknown()))])
    .optional(),
  onConflict: z.string().optional(),
  returning: z.boolean().optional(),
});

type FilterInput = z.infer<typeof filterSchema>;

class ValidationError extends Error {
  readonly statusCode: 400 | 403;
  constructor(message: string, statusCode: 400 | 403 = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function quoteIdent(ident: string): string {
  return `"${ident}"`;
}

function pgTypeCast(colType: ColumnType): string {
  switch (colType) {
    case "completion_phase":
      return "public.completion_phase";
    case "completion_step":
      return "public.completion_step";
    case "completion_activity":
      return "public.completion_activity";
    default:
      return colType;
  }
}

function serializeValue(colType: ColumnType, value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (colType === "jsonb") {
    return JSON.stringify(value);
  }
  return value;
}

function assertColumn(spec: TableSpec, colName: string): ColumnType {
  if (!Object.prototype.hasOwnProperty.call(spec.columns, colName)) {
    throw new ValidationError(`Unknown column "${colName}"`);
  }
  return spec.columns[colName];
}

function resolveReturningColumns(spec: TableSpec, rawColumns?: string): string {
  const trimmed = rawColumns?.trim();
  if (!trimmed || trimmed === "*") {
    return Object.keys(spec.columns).map(quoteIdent).join(", ");
  }

  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    throw new ValidationError("Columns list cannot be empty");
  }

  return parts
    .map((col) => {
      if (col === "*") {
        return Object.keys(spec.columns).map(quoteIdent).join(", ");
      }
      assertColumn(spec, col);
      return quoteIdent(col);
    })
    .join(", ");
}

function buildWhereClause(
  table: string,
  spec: TableSpec,
  filters: FilterInput[] | undefined,
  params: unknown[]
): { whereSql: string; emptyInShortCircuit: boolean } {
  const clauses: string[] = [];

  if (table === "workspace_settings") {
    clauses.push(`LEFT(${quoteIdent("key")}, ${SYSTEM_PREFIX.length}) <> '${SYSTEM_PREFIX}'`);
  }

  for (const filter of filters ?? []) {
    const colType = assertColumn(spec, filter.column);

    if (
      table === "workspace_settings" &&
      filter.column === "key" &&
      typeof filter.value === "string" &&
      filter.value.startsWith(SYSTEM_PREFIX)
    ) {
      throw new ValidationError("Access to system settings keys is forbidden", 403);
    }

    const colSql = quoteIdent(filter.column);

    if (filter.op === "is") {
      if (filter.value === null) {
        clauses.push(`${colSql} IS NULL`);
      } else {
        clauses.push(`${colSql} IS ${filter.value ? "TRUE" : "FALSE"}`);
      }
      continue;
    }

    if (filter.op === "in") {
      if (filter.value.length === 0) {
        return { whereSql: "", emptyInShortCircuit: true };
      }
      if (colType === "uuid[]") {
        throw new ValidationError(`"in" filter is not supported on array column "${filter.column}"`);
      }
      params.push(filter.value.map((item) => serializeValue(colType, item)));
      const idx = params.length;
      clauses.push(`${colSql} = ANY($${idx}::${pgTypeCast(colType)}[])`);
      continue;
    }

    if (filter.value === null) {
      throw new ValidationError(`Use "is" operator for null checks on "${filter.column}"`);
    }

    const sqlOp =
      filter.op === "eq"
        ? "="
        : filter.op === "neq"
          ? "<>"
          : filter.op === "gte"
            ? ">="
            : "<=";

    params.push(serializeValue(colType, filter.value));
    const idx = params.length;
    clauses.push(`${colSql} ${sqlOp} $${idx}::${pgTypeCast(colType)}`);
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    emptyInShortCircuit: false,
  };
}

function buildOrderClause(
  spec: TableSpec,
  orders: Array<{ column: string; ascending?: boolean; nullsFirst?: boolean }> | undefined
): string {
  if (!orders || orders.length === 0) return "";
  const parts = orders.map((item) => {
    assertColumn(spec, item.column);
    const dir = item.ascending === false ? "DESC" : "ASC";
    const nulls =
      item.nullsFirst === undefined
        ? ""
        : item.nullsFirst
          ? " NULLS FIRST"
          : " NULLS LAST";
    return `${quoteIdent(item.column)} ${dir}${nulls}`;
  });
  return `ORDER BY ${parts.join(", ")}`;
}

function formatPgError(err: unknown): { status: 400 | 409 | 500; message: string; code?: string } {
  const pgErr = err as { message?: string; code?: string } | undefined;
  const code = pgErr?.code;
  const message = pgErr?.message || "Database query error";
  if (code === "23505" || code === "23503" || code === "23514") {
    return { status: 409, message, code };
  }
  if (code && code.startsWith("22")) {
    return { status: 400, message, code };
  }
  return { status: 500, message, code };
}

function applySingleModifier(
  rows: Record<string, unknown>[],
  single: boolean | undefined,
  maybeSingle: boolean | undefined
): { status?: 406; data: unknown; error: { message: string; code: string } | null } {
  if (single) {
    if (rows.length !== 1) {
      return {
        status: 406,
        data: null,
        error: {
          code: "PGRST116",
          message: `JSON object requested, multiple (or no) rows returned (got ${rows.length})`,
        },
      };
    }
    return { data: rows[0], error: null };
  }

  if (maybeSingle) {
    if (rows.length > 1) {
      return {
        status: 406,
        data: null,
        error: {
          code: "PGRST116",
          message: `JSON object requested, multiple rows returned (got ${rows.length})`,
        },
      };
    }
    return { data: rows[0] ?? null, error: null };
  }

  return { data: rows, error: null };
}

function sendModifiedResponse(
  c: Context,
  rows: Record<string, unknown>[],
  single: boolean | undefined,
  maybeSingle: boolean | undefined,
  exactCount?: number | null
): Response {
  const modified = applySingleModifier(rows, single, maybeSingle);
  const includeCount = exactCount !== undefined;
  if (modified.status === 406) {
    return c.json(
      includeCount
        ? { data: null, count: exactCount, error: modified.error }
        : { data: null, error: modified.error },
      406
    );
  }
  return c.json(
    includeCount
      ? { data: modified.data, count: exactCount, error: null }
      : { data: modified.data, error: null }
  );
}

const adminSubmitStorySchema = z.object({
  projectId: z.string().uuid(),
  formId: z.string().trim().max(120).optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  isImported: z.boolean().optional().default(false),
  storySource: z.string().max(100).optional().nullable(),
  transcriptionStatus: z.string().max(50).optional().default("completed"),
  ...storySubmissionFieldsSchema,
});

export function createDbAdapterRoutes(db: PGlite): Hono {
  const router = new Hono();

  router.post("/submit-story", async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const parsed = adminSubmitStorySchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        { error: parsed.error.errors[0]?.message || "Invalid story payload" },
        400
      );
    }

    const payload = parsed.data;
    try {
      const result = await db.transaction((tx) =>
        insertStoryWithResponses(tx, {
          projectId: payload.projectId,
          formId: payload.formId ?? null,
          userId: payload.userId ?? null,
          isImported: payload.isImported,
          storySource: payload.storySource ?? null,
          transcriptionStatus: payload.transcriptionStatus,
          createdAt: null,
          payload,
        })
      );
      return c.json(result, 201);
    } catch (err) {
      const pgErr = formatPgError(err);
      return c.json({ error: pgErr.message, code: pgErr.code }, pgErr.status);
    }
  });

  router.post("/query", async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ data: null, error: { message: "Invalid JSON body" } }, 400);
    }

    const parsed = dbQuerySchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        {
          data: null,
          error: { message: parsed.error.errors[0]?.message || "Invalid query payload" },
        },
        400
      );
    }

    const req = parsed.data;
    const spec = Object.prototype.hasOwnProperty.call(TABLE_SCHEMAS, req.table)
      ? TABLE_SCHEMAS[req.table]
      : undefined;
    if (!spec) {
      return c.json(
        { data: null, error: { message: `Table "${req.table}" is not accessible` } },
        400
      );
    }

    if (req.action !== "select" && spec.readOnly) {
      return c.json(
        { data: null, error: { message: `Table "${req.table}" is read-only` } },
        400
      );
    }

    const qualifiedTable = `"public".${quoteIdent(req.table)}`;

    try {
      if (req.action === "select") {
        const params: unknown[] = [];
        const { whereSql, emptyInShortCircuit } = buildWhereClause(
          req.table,
          spec,
          req.filters,
          params
        );

        if (emptyInShortCircuit) {
          const exactCount = req.count === "exact" ? 0 : null;
          if (req.head) {
            return c.json({ data: null, count: exactCount, error: null });
          }
          return sendModifiedResponse(c, [], req.single, req.maybeSingle, exactCount);
        }

        let exactCount: number | null = null;
        if (req.count === "exact") {
          const countSql = `SELECT COUNT(*)::int AS total FROM ${qualifiedTable} ${whereSql}`;
          const countRes = await db.query<{ total: number }>(countSql, params);
          exactCount = Number(countRes.rows[0]?.total ?? 0);
        }

        if (req.head) {
          return c.json({ data: null, count: exactCount, error: null });
        }

        const selectCols = resolveReturningColumns(spec, req.columns);
        const orderSql = buildOrderClause(spec, req.order);

        let limitOffsetSql = "";
        const dataParams = [...params];
        if (req.range) {
          if (req.range.to < req.range.from) {
            throw new ValidationError("range.to must be >= range.from");
          }
          const span = Math.min(5000, req.range.to - req.range.from + 1);
          dataParams.push(span);
          const limitIdx = dataParams.length;
          dataParams.push(req.range.from);
          const offsetIdx = dataParams.length;
          limitOffsetSql = `LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
        } else if (req.limit !== undefined) {
          dataParams.push(req.limit);
          limitOffsetSql = `LIMIT $${dataParams.length}`;
        }

        const selectSql = [
          `SELECT ${selectCols} FROM ${qualifiedTable}`,
          whereSql,
          orderSql,
          limitOffsetSql,
        ]
          .filter(Boolean)
          .join(" ");

        const res = await db.query<Record<string, unknown>>(selectSql, dataParams);
        return sendModifiedResponse(c, res.rows, req.single, req.maybeSingle, exactCount);
      }

      if (req.action === "insert" || req.action === "upsert") {
        const rowsInput = Array.isArray(req.values)
          ? req.values
          : req.values
            ? [req.values]
            : [];

        if (rowsInput.length === 0) {
          throw new ValidationError(`${req.action} requires non-empty values`);
        }

        const keySet = new Set<string>();
        for (const row of rowsInput) {
          for (const [k, v] of Object.entries(row)) {
            assertColumn(spec, k);
            if (
              req.table === "workspace_settings" &&
              k === "key" &&
              typeof v === "string" &&
              v.startsWith(SYSTEM_PREFIX)
            ) {
              throw new ValidationError("Writing system settings keys is forbidden", 403);
            }
            if (v !== undefined) {
              keySet.add(k);
            }
          }
        }

        const insertCols = Array.from(keySet);
        if (insertCols.length === 0) {
          throw new ValidationError(`${req.action} row has no valid columns`);
        }

        const params: unknown[] = [];
        const tupleSqlList = rowsInput.map((row) => {
          const cells = insertCols.map((col) => {
            const val = row[col];
            if (val === undefined) {
              return "DEFAULT";
            }
            const colType = spec.columns[col];
            params.push(serializeValue(colType, val));
            return `$${params.length}::${pgTypeCast(colType)}`;
          });
          return `(${cells.join(", ")})`;
        });

        let conflictSql = "";
        if (req.action === "upsert") {
          const conflictCols = (req.onConflict || "id")
            .split(",")
            .map((part) => part.trim())
            .filter((part) => part.length > 0);

          if (conflictCols.length === 0) {
            throw new ValidationError("Invalid onConflict target");
          }
          for (const col of conflictCols) {
            assertColumn(spec, col);
          }

          const conflictSet = new Set(conflictCols);
          const updateCols = insertCols.filter((col) => !conflictSet.has(col));
          const targetSql = conflictCols.map(quoteIdent).join(", ");
          if (updateCols.length > 0) {
            const assignSql = updateCols
              .map((col) => `${quoteIdent(col)} = EXCLUDED.${quoteIdent(col)}`)
              .join(", ");
            conflictSql = `ON CONFLICT (${targetSql}) DO UPDATE SET ${assignSql}`;
          } else {
            conflictSql = `ON CONFLICT (${targetSql}) DO NOTHING`;
          }
        }

        const shouldReturn = Boolean(req.returning || req.single || req.maybeSingle);
        const returningSql = shouldReturn
          ? `RETURNING ${resolveReturningColumns(spec, req.columns)}`
          : "";

        const sql = [
          `INSERT INTO ${qualifiedTable} (${insertCols.map(quoteIdent).join(", ")})`,
          `VALUES ${tupleSqlList.join(", ")}`,
          conflictSql,
          returningSql,
        ]
          .filter(Boolean)
          .join(" ");

        const res = await db.query<Record<string, unknown>>(sql, params);
        if (!shouldReturn) {
          return c.json({ data: null, error: null });
        }

        return sendModifiedResponse(c, res.rows, req.single, req.maybeSingle);
      }

      if (req.action === "update") {
        if (!req.filters || req.filters.length === 0) {
          throw new ValidationError("update requires at least one filter");
        }
        const row =
          req.values && !Array.isArray(req.values) ? req.values : null;
        if (!row) {
          throw new ValidationError("update requires a single values object");
        }

        const params: unknown[] = [];
        const setParts: string[] = [];
        for (const [k, v] of Object.entries(row)) {
          if (v === undefined) continue;
          const colType = assertColumn(spec, k);
          if (
            req.table === "workspace_settings" &&
            k === "key" &&
            typeof v === "string" &&
            v.startsWith(SYSTEM_PREFIX)
          ) {
            throw new ValidationError("Updating system settings keys is forbidden", 403);
          }
          params.push(serializeValue(colType, v));
          setParts.push(`${quoteIdent(k)} = $${params.length}::${pgTypeCast(colType)}`);
        }

        if (setParts.length === 0) {
          throw new ValidationError("update values cannot be empty");
        }

        const { whereSql, emptyInShortCircuit } = buildWhereClause(
          req.table,
          spec,
          req.filters,
          params
        );
        if (emptyInShortCircuit) {
          if (!req.returning && !req.single && !req.maybeSingle) {
            return c.json({ data: null, error: null });
          }
          return sendModifiedResponse(c, [], req.single, req.maybeSingle);
        }

        const shouldReturn = Boolean(req.returning || req.single || req.maybeSingle);
        const returningSql = shouldReturn
          ? `RETURNING ${resolveReturningColumns(spec, req.columns)}`
          : "";

        const sql = `UPDATE ${qualifiedTable} SET ${setParts.join(", ")} ${whereSql} ${returningSql}`.trim();
        const res = await db.query<Record<string, unknown>>(sql, params);
        if (!shouldReturn) {
          return c.json({ data: null, error: null });
        }

        return sendModifiedResponse(c, res.rows, req.single, req.maybeSingle);
      }

      // action === "delete"
      if (!req.filters || req.filters.length === 0) {
        throw new ValidationError("delete requires at least one filter");
      }

      const params: unknown[] = [];
      const { whereSql, emptyInShortCircuit } = buildWhereClause(
        req.table,
        spec,
        req.filters,
        params
      );
      if (emptyInShortCircuit) {
        const exactCount = req.count === "exact" ? 0 : null;
        if (!req.returning && !req.single && !req.maybeSingle) {
          return c.json({ data: null, count: exactCount, error: null });
        }
        return sendModifiedResponse(c, [], req.single, req.maybeSingle, exactCount);
      }

      const shouldReturn = Boolean(req.returning || req.single || req.maybeSingle || req.count === "exact");
      const returningSql = shouldReturn
        ? `RETURNING ${resolveReturningColumns(spec, req.columns)}`
        : "";

      const sql = `DELETE FROM ${qualifiedTable} ${whereSql} ${returningSql}`.trim();
      const res = await db.query<Record<string, unknown>>(sql, params);
      const exactCount = req.count === "exact" ? res.rows.length : null;

      if (!req.returning && !req.single && !req.maybeSingle) {
        return c.json({ data: null, count: exactCount, error: null });
      }

      return sendModifiedResponse(c, res.rows, req.single, req.maybeSingle, exactCount);
    } catch (err) {
      if (err instanceof ValidationError) {
        return c.json({ data: null, error: { message: err.message } }, err.statusCode);
      }
      const pgErr = formatPgError(err);
      return c.json(
        { data: null, error: { message: pgErr.message, code: pgErr.code } },
        pgErr.status
      );
    }
  });

  return router;
}

