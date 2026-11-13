import type { PGlite } from "@electric-sql/pglite";
import type { Context, MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { decryptSecretValue, encryptSecretValue } from "../utils/crypto.ts";

interface RpcRoutesDeps {
  db: PGlite;
  tokenEncryptionKey: Buffer;
  requireAdminAuth: MiddlewareHandler;
  publicRpcRateLimit: MiddlewareHandler;
}

type RpcHandler = (db: PGlite, rawArgs: unknown) => Promise<unknown>;

const uuidSchema = z.string().uuid();

function parseWith<T>(schema: z.ZodType<T>, rawArgs: unknown): T {
  const res = schema.safeParse(rawArgs ?? {});
  if (!res.success) {
    throw new RpcValidationError(res.error.errors[0]?.message || "Invalid RPC arguments");
  }
  return res.data;
}

class RpcValidationError extends Error {}

function createScalarRpc<T>(
  schema: z.ZodType<T>,
  sql: string,
  mapParams: (args: T) => unknown[]
): RpcHandler {
  return async (db, rawArgs) => {
    const args = parseWith(schema, rawArgs);
    const res = await db.query<{ result: unknown }>(sql, mapParams(args));
    return res.rows[0]?.result ?? null;
  };
}

function createRowsRpc<T>(
  schema: z.ZodType<T>,
  sql: string,
  mapParams: (args: T) => unknown[]
): RpcHandler {
  return async (db, rawArgs) => {
    const args = parseWith(schema, rawArgs);
    const res = await db.query<Record<string, unknown>>(sql, mapParams(args));
    return res.rows;
  };
}

const activityLookupSchema = z.object({
  project_id: uuidSchema,
  phase_id: z.string().min(1),
  step_id: z.string().min(1),
  activity_id: z.string().min(1),
});

const completionSchema = z.object({
  p_project_id: uuidSchema,
  p_phase: z.string().min(1),
  p_step: z.string().min(1),
  p_activity: z.string().min(1),
});

const PUBLIC_RPCS: Readonly<Record<string, RpcHandler>> = {
  get_project_id_by_form_id: createScalarRpc(
    z.object({ p_form_id: z.string().min(1) }),
    `SELECT public.get_project_id_by_form_id($1::text) AS result`,
    (a) => [a.p_form_id]
  ),
  get_public_form_config: createRowsRpc(
    z.object({ p_form_id: z.string().min(1) }),
    `SELECT * FROM public.get_public_form_config($1::text)`,
    (a) => [a.p_form_id]
  ),
  has_public_form_id: createScalarRpc(
    z.object({ project_id: uuidSchema }),
    `SELECT public.has_public_form_id($1::uuid) AS result`,
    (a) => [a.project_id]
  ),
  validate_dashboard_token: createScalarRpc(
    z.object({ token_value: z.string().min(1) }),
    `SELECT public.validate_dashboard_token($1::text) AS result`,
    (a) => [a.token_value]
  ),
  get_public_dashboard_data: createScalarRpc(
    z.object({ token_value: z.string().min(1) }),
    `SELECT public.get_public_dashboard_data($1::text) AS result`,
    (a) => [a.token_value]
  ),
};

function buildAdminRpcs(tokenEncryptionKey: Buffer): Readonly<Record<string, RpcHandler>> {
  return {
    fetch_activity_response: createScalarRpc(
      activityLookupSchema,
      `SELECT public.fetch_activity_response($1::uuid, $2::text, $3::text, $4::text) AS result`,
      (a) => [a.project_id, a.phase_id, a.step_id, a.activity_id]
    ),
    insert_activity_response: createScalarRpc(
      activityLookupSchema.extend({
        response_data: z.unknown(),
        p_updated_at: z.string().datetime({ offset: true }).optional().nullable(),
      }),
      `SELECT public.insert_activity_response($1::uuid, $2::text, $3::text, $4::text, $5::jsonb, COALESCE($6::timestamptz, now())) AS result`,
      (a) => [
        a.project_id,
        a.phase_id,
        a.step_id,
        a.activity_id,
        JSON.stringify(a.response_data ?? {}),
        a.p_updated_at ?? null,
      ]
    ),
    fetch_template_activity_response: createScalarRpc(
      activityLookupSchema,
      `SELECT public.fetch_template_activity_response($1::uuid, $2::text, $3::text, $4::text) AS result`,
      (a) => [a.project_id, a.phase_id, a.step_id, a.activity_id]
    ),
    save_template_activity_response: createScalarRpc(
      activityLookupSchema.extend({ response_data: z.unknown() }),
      `SELECT public.save_template_activity_response($1::uuid, $2::text, $3::text, $4::text, $5::jsonb) AS result`,
      (a) => [
        a.project_id,
        a.phase_id,
        a.step_id,
        a.activity_id,
        JSON.stringify(a.response_data ?? {}),
      ]
    ),
    copy_template_to_user: createRowsRpc(
      z.object({ template_id: uuidSchema, new_project_name: z.string().min(1) }),
      `SELECT * FROM public.copy_template_to_user($1::uuid, $2::text)`,
      (a) => [a.template_id, a.new_project_name]
    ),
    delete_project: createScalarRpc(
      z.object({ project_id_param: uuidSchema }),
      `SELECT public.delete_project($1::uuid) AS result`,
      (a) => [a.project_id_param]
    ),
    delete_story_with_responses: createScalarRpc(
      z.object({ story_id_param: z.string().min(1) }),
      `SELECT public.delete_story_with_responses($1::text) AS result`,
      (a) => [a.story_id_param]
    ),
    is_activity_completed: createScalarRpc(
      completionSchema,
      `SELECT public.is_activity_completed($1::uuid, $2::public.completion_phase, $3::public.completion_step, $4::public.completion_activity) AS result`,
      (a) => [a.p_project_id, a.p_phase, a.p_step, a.p_activity]
    ),
    mark_activity_completed: createScalarRpc(
      completionSchema,
      `SELECT public.mark_activity_completed($1::uuid, $2::public.completion_phase, $3::public.completion_step, $4::public.completion_activity) AS result`,
      (a) => [a.p_project_id, a.p_phase, a.p_step, a.p_activity]
    ),
    create_dashboard_token: async (db, rawArgs) => {
      const args = parseWith(
        z.object({
          p_project_id: uuidSchema,
          p_token: z.string().min(1).max(512),
          p_created_at: z.string().datetime({ offset: true }).optional().nullable(),
          p_expires_at: z.string().datetime({ offset: true }).optional().nullable(),
        }),
        rawArgs
      );
      const encryptedToken = encryptSecretValue(tokenEncryptionKey, args.p_token);

      return await db.transaction(async (tx) => {
        const created = await tx.query<{ id: string; public_slug: string }>(
          `SELECT * FROM public.create_dashboard_token($1::uuid, $2::text, COALESCE($3::timestamptz, now()), $4::timestamptz)`,
          [
            args.p_project_id,
            args.p_token,
            args.p_created_at ?? null,
            args.p_expires_at ?? null,
          ]
        );
        const createdRow = created.rows[0];
        if (!createdRow) {
          throw new Error("Failed to create dashboard token");
        }
        await tx.query(
          `UPDATE public.dashboard_tokens SET token_encrypted = $1 WHERE id = $2::uuid`,
          [encryptedToken, createdRow.id]
        );
        return created.rows;
      });
    },
    get_project_dashboard_tokens: async (db, rawArgs) => {
      const args = parseWith(z.object({ p_project_id: uuidSchema }), rawArgs);
      const res = await db.query<{ result: Array<Record<string, unknown>> }>(
        `SELECT public.get_project_dashboard_tokens($1::uuid) AS result`,
        [args.p_project_id]
      );
      const list = Array.isArray(res.rows[0]?.result) ? res.rows[0].result : [];
      return list.map((item) => {
        if (typeof item.token !== "string") return item;
        try {
          return { ...item, token: decryptSecretValue(tokenEncryptionKey, item.token) };
        } catch {
          return { ...item, token: null };
        }
      });
    },
  };
}

async function executeRpc(
  c: Context,
  db: PGlite,
  handler: RpcHandler
): Promise<Response> {
  let rawArgs: unknown = {};
  const text = await c.req.text();
  if (text.trim().length > 0) {
    try {
      rawArgs = JSON.parse(text);
    } catch {
      return c.json({ data: null, error: { message: "Invalid JSON body" } }, 400);
    }
  }

  try {
    const data = await handler(db, rawArgs);
    return c.json({ data, error: null });
  } catch (err) {
    if (err instanceof RpcValidationError) {
      return c.json({ data: null, error: { message: err.message } }, 400);
    }
    const pgErr = err as { message?: string; code?: string } | undefined;
    console.error("[rpc] execution error:", err);
    return c.json(
      {
        data: null,
        error: {
          message: "RPC execution failed",
          code: pgErr?.code,
        },
      },
      400
    );
  }
}

export function createRpcRoutes(deps: RpcRoutesDeps): Hono {
  const router = new Hono();
  const adminRpcs = buildAdminRpcs(deps.tokenEncryptionKey);

  router.use("/:fnName", async (c, next) => {
    const fnName = c.req.param("fnName");
    if (Object.prototype.hasOwnProperty.call(PUBLIC_RPCS, fnName)) {
      return deps.publicRpcRateLimit(c, next);
    }
    return deps.requireAdminAuth(c, next);
  });

  router.post("/:fnName", async (c) => {
    const fnName = c.req.param("fnName");
    const handler = Object.prototype.hasOwnProperty.call(PUBLIC_RPCS, fnName)
      ? PUBLIC_RPCS[fnName]
      : Object.prototype.hasOwnProperty.call(adminRpcs, fnName)
        ? adminRpcs[fnName]
        : undefined;

    if (!handler) {
      return c.json({ data: null, error: { message: `Unknown RPC "${fnName}"` } }, 404);
    }

    return executeRpc(c, deps.db, handler);
  });

  return router;
}

