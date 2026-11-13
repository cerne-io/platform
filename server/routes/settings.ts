import type { PGlite } from "@electric-sql/pglite";
import { Hono } from "hono";
import { z } from "zod";
import { DEFAULT_AI_PROMPTS } from "../db/prompts.ts";
import { encryptSecretValue } from "../utils/crypto.ts";
import {
  callChatCompletions,
  LLM_API_KEY_SETTING,
  LLM_BASE_URL_SETTING,
  LLM_MODEL_SETTING,
  PUBLIC_INTERVIEWER_AI_SETTING,
  LlmCallError,
  maskApiKey,
  normalizeBaseUrl,
  resolveLlmConfig,
} from "../utils/llmConfig.ts";

interface SettingsRoutesDeps {
  db: PGlite;
  tokenEncryptionKey: Buffer;
}

const updateLlmSchema = z
  .object({
    baseUrl: z.string().trim().min(1, "Base URL is required").optional(),
    model: z.string().trim().min(1, "Model name is required").max(200).optional(),
    apiKey: z.string().optional(),
    clearApiKey: z.boolean().optional(),
    publicInterviewerAiEnabled: z.boolean().optional(),
  })
  .refine(
    (data) =>
      (data.baseUrl !== undefined && data.model !== undefined) ||
      (data.baseUrl === undefined &&
        data.model === undefined &&
        data.publicInterviewerAiEnabled !== undefined),
    "Base URL and Model are required when updating provider configuration"
  );

const testLlmSchema = z
  .object({
    baseUrl: z.string().trim().optional(),
    model: z.string().trim().optional(),
    apiKey: z.string().optional(),
  })
  .optional();

export function createSettingsRoutes(deps: SettingsRoutesDeps): Hono {
  const { db, tokenEncryptionKey } = deps;
  const router = new Hono();

  function formatLlmSettings(cfg: Awaited<ReturnType<typeof resolveLlmConfig>>) {
    return {
      hasApiKey: cfg.apiKey.length > 0,
      maskedApiKey: maskApiKey(cfg.apiKey),
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      keySource: cfg.keySource,
      publicInterviewerAiEnabled: cfg.publicInterviewerAiEnabled,
    };
  }

  router.get("/llm", async (c) => {
    const cfg = await resolveLlmConfig(db, tokenEncryptionKey);
    return c.json(formatLlmSettings(cfg));
  });

  router.put("/llm", async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const parsed = updateLlmSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        { error: parsed.error.errors[0]?.message || "Invalid settings payload" },
        400
      );
    }

    let normalizedBaseUrl: string | undefined;
    if (parsed.data.baseUrl !== undefined) {
      try {
        normalizedBaseUrl = normalizeBaseUrl(parsed.data.baseUrl);
      } catch (err) {
        return c.json(
          { error: err instanceof Error ? err.message : "Invalid Base URL" },
          400
        );
      }
    }

    await db.transaction(async (tx) => {
      if (normalizedBaseUrl !== undefined && parsed.data.model !== undefined) {
        await tx.query(
          `INSERT INTO public.workspace_settings (key, value, updated_at)
           VALUES ($1, $2::jsonb, now()), ($3, $4::jsonb, now())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
          [
            LLM_BASE_URL_SETTING,
            JSON.stringify(normalizedBaseUrl),
            LLM_MODEL_SETTING,
            JSON.stringify(parsed.data.model),
          ]
        );
      }

      if (parsed.data.publicInterviewerAiEnabled !== undefined) {
        await tx.query(
          `INSERT INTO public.workspace_settings (key, value, updated_at)
           VALUES ($1, $2::jsonb, now())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
          [
            PUBLIC_INTERVIEWER_AI_SETTING,
            JSON.stringify(parsed.data.publicInterviewerAiEnabled),
          ]
        );
      }

      if (parsed.data.clearApiKey) {
        await tx.query(`DELETE FROM public.workspace_settings WHERE key = $1`, [
          LLM_API_KEY_SETTING,
        ]);
      } else if (parsed.data.apiKey && parsed.data.apiKey.trim().length > 0) {
        const encrypted = encryptSecretValue(
          tokenEncryptionKey,
          parsed.data.apiKey.trim()
        );
        await tx.query(
          `INSERT INTO public.workspace_settings (key, value, updated_at)
           VALUES ($1, $2::jsonb, now())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
          [LLM_API_KEY_SETTING, JSON.stringify(encrypted)]
        );
      }
    });

    const updated = await resolveLlmConfig(db, tokenEncryptionKey);
    return c.json(formatLlmSettings(updated));
  });

  router.post("/llm/test", async (c) => {
    let rawBody: unknown = {};
    const bodyText = await c.req.text();
    if (bodyText.trim().length > 0) {
      try {
        rawBody = JSON.parse(bodyText);
      } catch {
        return c.json({ error: "Invalid JSON body" }, 400);
      }
    }

    const parsed = testLlmSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: "Invalid test payload" }, 400);
    }

    const saved = await resolveLlmConfig(db, tokenEncryptionKey);
    let baseUrl = saved.baseUrl;
    if (parsed.data?.baseUrl) {
      try {
        baseUrl = normalizeBaseUrl(parsed.data.baseUrl);
      } catch (err) {
        return c.json(
          { error: err instanceof Error ? err.message : "Invalid Base URL" },
          400
        );
      }
    }

    const model = parsed.data?.model || saved.model;
    const sameOrigin = new URL(baseUrl).origin === new URL(saved.baseUrl).origin;
    const apiKey = parsed.data?.apiKey?.trim() || (sameOrigin ? saved.apiKey : "");

    const start = Date.now();
    try {
      await callChatCompletions({
        baseUrl,
        apiKey,
        model,
        messages: [{ role: "user", content: "Reply with OK." }],
        temperature: 0,
        maxTokens: 12,
      });
      return c.json({ ok: true, model, baseUrl, latencyMs: Date.now() - start });
    } catch (err) {
      if (err instanceof LlmCallError) {
        return c.json({ ok: false, error: err.message, errorCode: err.errorCode }, err.statusCode);
      }
      return c.json(
        { ok: false, error: err instanceof Error ? err.message : "Connection test failed" },
        502
      );
    }
  });

  router.post("/prompts/reset", async (c) => {
    await db.transaction(async (tx) => {
      for (const prompt of DEFAULT_AI_PROMPTS) {
        await tx.query(
          `INSERT INTO public.ai_prompts (prompt_key, title, category, description, content)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (prompt_key) DO UPDATE SET
             title = EXCLUDED.title,
             category = EXCLUDED.category,
             description = EXCLUDED.description,
             content = EXCLUDED.content,
             updated_at = now(),
             version = public.ai_prompts.version + 1`,
          [prompt.prompt_key, prompt.title, prompt.category, prompt.description, prompt.content]
        );
      }
    });

    return c.json({ ok: true, count: DEFAULT_AI_PROMPTS.length });
  });

  return router;
}

