import type { PGlite } from "@electric-sql/pglite";
import type { Context, MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import {
  callChatCompletions,
  type ChatCompletionMessage,
  isDefaultOpenAiBaseUrl,
  LlmCallError,
  resolveLlmConfig,
} from "../utils/llmConfig.ts";
import { resolveActiveForm } from "./public.ts";

interface AiRoutesDeps {
  db: PGlite;
  tokenEncryptionKey: Buffer;
  requireAdminAuth: MiddlewareHandler;
  publicAiRateLimit: MiddlewareHandler;
}

const VALID_SENTIMENTS = new Set(["positive", "negative", "neutral"]);

const assistantRequestSchema = z.object({
  prompt: z.string().max(40_000).optional().default(""),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(20_000),
      })
    )
    .max(50)
    .optional(),
  projectContext: z.string().max(40_000).optional(),
  requestType: z.string().optional(),
  mode: z.string().optional(),
  intent: z.string().optional(),
  model: z.string().optional(),
  promptKey: z.string().optional(),
  promptVariables: z.record(z.unknown()).optional(),
});

const translateRequestSchema = z.object({
  prompt: z.string().max(40_000).optional(),
  content: z.unknown().refine((v) => v !== undefined && v !== null, "content is required"),
  targetLanguage: z.string().optional(),
  targetLanguages: z.array(z.string().min(1).max(32)).min(1).max(30).optional(),
  model: z.string().optional(),
});

const sentimentRequestSchema = z.object({
  emotions: z.array(z.string().trim().min(1).max(200)).max(50),
  projectId: z.string().uuid().optional(),
  dashboardToken: z.string().min(1).optional(),
});

const interviewerRequestSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required").max(20_000),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(20_000),
      })
    )
    .max(30)
    .optional(),
  projectContext: z.string().max(40_000).optional(),
  storyQuestion: z.string().max(4_000).optional(),
  projectId: z.string().uuid().optional(),
  formId: z.string().trim().min(1).max(120).optional(),
  language: z.string().trim().max(32).optional(),
});

const INTERVIEWER_CRITICAL_CONSTRAINTS = `CRITICAL RULES (MUST FOLLOW STRICTLY):
1. Ask ONE brief follow-up question ONLY to clarify or deepen the initial story shared (specific example, moment, or felt experience).
2. Maintain a neutral, curious, non-judgmental tone. Do NOT evaluate ("that's great", "I'm sorry") or offer advice/solutions.
3. Do NOT introduce new topics or ask demographic/slider questions.`;

const BCP47_TAG_RE = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i;

async function hasAdminSession(c: Context, requireAdminAuth: MiddlewareHandler): Promise<boolean> {
  let passed = false;
  await requireAdminAuth(c, async () => {
    passed = true;
  });
  return passed;
}

function extractStoryQuestionText(arResponse: unknown, language?: string): string {
  if (!arResponse || typeof arResponse !== "object") return "";
  const raw = (arResponse as { storyQuestion?: unknown; question?: unknown }).storyQuestion ??
    (arResponse as { question?: unknown }).question;
  if (typeof raw === "string") return raw.trim();
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const localized = raw as Record<string, unknown>;
    const preferred =
      (language && typeof localized[language] === "string" && localized[language]) ||
      (typeof localized.en === "string" && localized.en) ||
      Object.values(localized).find((v) => typeof v === "string");
    return typeof preferred === "string" ? preferred.trim() : "";
  }
  return "";
}

async function loadPublicStoryQuestion(
  db: PGlite,
  projectId: string,
  language?: string
): Promise<string> {
  const res = await db.query<{
    ar_response: unknown;
  }>(
    `SELECT ar_response
     FROM public.activity_responses
     WHERE ar_project_id = $1::uuid
       AND ar_phase_id = 'collection'
       AND ar_step_id = 'public-form'
       AND ar_activity_id = 'story-question'
     LIMIT 1`,
    [projectId]
  );

  return res.rows[0] ? extractStoryQuestionText(res.rows[0].ar_response, language) : "";
}

async function loadPromptMap(db: PGlite): Promise<Map<string, string>> {
  const res = await db.query<{ prompt_key: string; content: string }>(
    `SELECT prompt_key, content FROM public.ai_prompts`
  );
  const map = new Map<string, string>();
  for (const row of res.rows) {
    map.set(row.prompt_key, row.content);
  }
  return map;
}

function interpolateTemplate(
  template: string,
  variables: Record<string, string>,
  promptMap: Map<string, string>,
  depth = 0
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return variables[key];
    }
    if (depth < 3 && promptMap.has(key)) {
      return interpolateTemplate(promptMap.get(key)!, variables, promptMap, depth + 1);
    }
    return match;
  });
}

function normalizeVariables(
  raw: Record<string, unknown> | undefined,
  projectContext: string | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  if (projectContext !== undefined) {
    out.projectContext = projectContext;
    out.context = projectContext;
  }
  if (raw) {
    for (const [k, v] of Object.entries(raw)) {
      if (v !== undefined && v !== null) {
        out[k] = typeof v === "string" ? v : JSON.stringify(v);
      }
    }
  }
  return out;
}

function handleAiError(c: Context, err: unknown): Response {
  if (err instanceof LlmCallError) {
    return c.json({ error: err.message, errorCode: err.errorCode }, err.statusCode);
  }
  const message = err instanceof Error ? err.message : "AI request failed";
  return c.json({ error: message, errorCode: "api_error" }, 500);
}

async function runTranslation(
  db: PGlite,
  tokenEncryptionKey: Buffer,
  options: {
    content: unknown;
    targets: string[];
    model?: string;
    signal?: AbortSignal;
  }
): Promise<string> {
  const [cfg, promptMap] = await Promise.all([
    resolveLlmConfig(db, tokenEncryptionKey),
    loadPromptMap(db),
  ]);
  const systemPrompt =
    promptMap.get("translation_system") ||
    "You are a professional translator specializing in cultural and narrative research content.";

  const serializedContent =
    typeof options.content === "string" ? options.content : JSON.stringify(options.content);

  const userPrompt = [
    `Translate the following content accurately into these target language codes: ${options.targets.join(", ")}.`,
    `Preserve meaning, tone, placeholder tokens, and JSON structure if an object/array is provided.`,
    `Return ONLY a valid JSON object mapping each target language code (${options.targets.map((t) => `"${t}"`).join(", ")}) to its translated value, with no markdown fences or extra commentary.`,
    ``,
    `Content to translate:`,
    serializedContent,
  ].join("\n");

  return callChatCompletions({
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    model: options.model || cfg.model,
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    signal: options.signal,
  });
}

async function runBatchSentiment(
  db: PGlite,
  tokenEncryptionKey: Buffer,
  emotions: string[],
  signal?: AbortSignal
): Promise<Array<{ emotion: string; sentiment: "positive" | "negative" | "neutral" }>> {
  const uniqueEmotions = Array.from(new Set(emotions.map((e) => e.trim()).filter(Boolean)));
  if (uniqueEmotions.length === 0) return [];

  const normalizedKeys = uniqueEmotions.map((e) => e.toLowerCase());
  const cachedRes = await db.query<{ emotion_text: string; sentiment: string }>(
    `SELECT lower(trim(emotion_text)) AS emotion_text, sentiment
     FROM public.sentiment_cache
     WHERE lower(trim(emotion_text)) = ANY($1::text[])`,
    [normalizedKeys]
  );

  const cacheMap = new Map<string, "positive" | "negative" | "neutral">();
  for (const row of cachedRes.rows) {
    if (VALID_SENTIMENTS.has(row.sentiment)) {
      cacheMap.set(row.emotion_text, row.sentiment as "positive" | "negative" | "neutral");
    }
  }

  const uncached: string[] = [];
  const seenLower = new Set<string>();
  for (const emotion of uniqueEmotions) {
    const lower = emotion.toLowerCase();
    if (!cacheMap.has(lower) && !seenLower.has(lower)) {
      seenLower.add(lower);
      uncached.push(emotion);
    }
  }

  if (uncached.length > 0) {
    const cfg = await resolveLlmConfig(db, tokenEncryptionKey);
    const completion = await callChatCompletions({
      baseUrl: cfg.baseUrl,
      apiKey: cfg.apiKey,
      model: cfg.model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            'Classify each emotion/feeling word or short phrase strictly as "positive", "negative", or "neutral". Return ONLY valid JSON array: [{"emotion":"...","sentiment":"positive|negative|neutral"}].',
        },
        {
          role: "user",
          content: JSON.stringify(uncached),
        },
      ],
      signal,
    });

    let jsonText = completion.trim();
    const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence) jsonText = fence[1].trim();
    const startBracket = jsonText.indexOf("[");
    const endBracket = jsonText.lastIndexOf("]");
    if (startBracket !== -1 && endBracket > startBracket) {
      jsonText = jsonText.slice(startBracket, endBracket + 1);
    }

    let parsedItems: Array<{ emotion?: unknown; sentiment?: unknown }> = [];
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (Array.isArray(parsed)) {
        parsedItems = parsed as Array<{ emotion?: unknown; sentiment?: unknown }>;
      }
    } catch {
      parsedItems = [];
    }

    const requested = new Set(uncached.map((e) => e.trim().toLowerCase()));
    for (const item of parsedItems) {
      if (typeof item.emotion !== "string" || typeof item.sentiment !== "string") continue;
      const cleanEmotion = item.emotion.trim();
      const normSentiment = item.sentiment.trim().toLowerCase();
      if (!cleanEmotion || !requested.has(cleanEmotion.toLowerCase()) || !VALID_SENTIMENTS.has(normSentiment)) continue;

      const sentiment = normSentiment as "positive" | "negative" | "neutral";
      cacheMap.set(cleanEmotion.toLowerCase(), sentiment);

      await db.query(
        `INSERT INTO public.sentiment_cache (emotion_text, sentiment)
         VALUES ($1, $2)
         ON CONFLICT (emotion_text) DO UPDATE SET sentiment = EXCLUDED.sentiment, updated_at = now()`,
        [cleanEmotion.toLowerCase(), sentiment]
      );
    }
  }

  return uniqueEmotions
    .map((emotion) => {
      const sentiment = cacheMap.get(emotion.toLowerCase());
      return sentiment ? { emotion, sentiment } : null;
    })
    .filter(
      (item): item is { emotion: string; sentiment: "positive" | "negative" | "neutral" } =>
        item !== null
    );
}

export function createAiRoutes(deps: AiRoutesDeps): Hono {
  const { db, tokenEncryptionKey, requireAdminAuth, publicAiRateLimit } = deps;
  const router = new Hono();

  router.post("/assistant", requireAdminAuth, async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body", errorCode: "bad_request" }, 400);
    }

    const parsed = assistantRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        { error: parsed.error.errors[0]?.message || "Invalid AI request", errorCode: "bad_request" },
        400
      );
    }

    const req = parsed.data;

    try {
      const [cfg, promptMap] = await Promise.all([
        resolveLlmConfig(db, tokenEncryptionKey),
        loadPromptMap(db),
      ]);

      const vars = normalizeVariables(req.promptVariables, req.projectContext);
      let systemPrompt = "";
      let userPrompt = req.prompt;

      if (req.promptKey && promptMap.has(req.promptKey)) {
        const renderedTemplate = interpolateTemplate(
          promptMap.get(req.promptKey)!,
          vars,
          promptMap
        );

        if (req.promptKey === "guided_design_evaluation") {
          systemPrompt = renderedTemplate;
        } else if (req.promptKey === "slider_question_prompt") {
          const sysBase = promptMap.get("slider_questions_system") || "";
          const ctxTpl = req.projectContext
            ? interpolateTemplate(
                promptMap.get("slider_questions_project_context") || "{context}",
                vars,
                promptMap
              )
            : "";
          systemPrompt = [sysBase, ctxTpl].filter(Boolean).join("\n\n");
          userPrompt = renderedTemplate;
        } else if (req.promptKey === "triangle_questions_prompt") {
          const sysBase = promptMap.get("triangle_questions_system") || "";
          const ctxTpl = req.projectContext
            ? interpolateTemplate(
                promptMap.get("triangle_questions_project_context") || "{context}",
                vars,
                promptMap
              )
            : "";
          systemPrompt = [sysBase, ctxTpl].filter(Boolean).join("\n\n");
          userPrompt = renderedTemplate;
        } else if (req.promptKey === "story_question_prompt") {
          const sysBase = promptMap.get("story_question_system") || "";
          const bestPractices = promptMap.get("story_question_best_practices") || "";
          systemPrompt = [
            sysBase,
            bestPractices,
            req.projectContext ? `PROJECT CONTEXT:\n${req.projectContext}` : "",
          ]
            .filter(Boolean)
            .join("\n\n");
          userPrompt = renderedTemplate;
        } else {
          systemPrompt = [
            renderedTemplate,
            req.projectContext ? `PROJECT CONTEXT:\n${req.projectContext}` : "",
          ]
            .filter(Boolean)
            .join("\n\n");
        }
      } else if (req.mode === "suggestNextStep" || req.requestType === "suggestNextStep") {
        const tpl = promptMap.get("suggest_next_step_prompt") || "";
        systemPrompt = [
          interpolateTemplate(tpl, vars, promptMap),
          req.projectContext ? `PROJECT CONTEXT:\n${req.projectContext}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");
      } else if (req.mode === "improve" || req.requestType === "improve") {
        systemPrompt = promptMap.get("story_question_improver") || "";
      } else {
        const baseSystem = interpolateTemplate(
          promptMap.get("design_assistant_system") || "",
          vars,
          promptMap
        );
        systemPrompt = [
          baseSystem,
          req.projectContext ? `PROJECT CONTEXT:\n${req.projectContext}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");
      }

      const messages: ChatCompletionMessage[] = [];
      if (systemPrompt.trim()) {
        messages.push({ role: "system", content: systemPrompt });
      }
      for (const msg of req.history ?? []) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
      if (userPrompt.trim()) {
        messages.push({ role: "user", content: userPrompt });
      }

      const response = await callChatCompletions({
        baseUrl: cfg.baseUrl,
        apiKey: cfg.apiKey,
        model: req.model || cfg.model,
        messages,
        signal: c.req.raw.signal,
      });

      return c.json({ response });
    } catch (err) {
      return handleAiError(c, err);
    }
  });

  router.post("/translate", requireAdminAuth, async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body", errorCode: "bad_request" }, 400);
    }

    const parsed = translateRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        { error: parsed.error.errors[0]?.message || "Invalid translate payload", errorCode: "bad_request" },
        400
      );
    }

    const targets =
      parsed.data.targetLanguages && parsed.data.targetLanguages.length > 0
        ? parsed.data.targetLanguages
        : parsed.data.targetLanguage
          ? [parsed.data.targetLanguage]
          : [];

    if (targets.length === 0) {
      return c.json({ error: "targetLanguages is required", errorCode: "bad_request" }, 400);
    }

    try {
      const response = await runTranslation(db, tokenEncryptionKey, {
        content: parsed.data.content,
        targets,
        model: parsed.data.model,
        signal: c.req.raw.signal,
      });
      return c.json({ response });
    } catch (err) {
      return handleAiError(c, err);
    }
  });

  router.post("/sentiment", publicAiRateLimit, async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body", errorCode: "bad_request" }, 400);
    }

    const parsed = sentimentRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        { error: parsed.error.errors[0]?.message || "Invalid sentiment payload", errorCode: "bad_request" },
        400
      );
    }

    const { emotions, projectId, dashboardToken } = parsed.data;

    let tokenProjectId: string | null = null;
    if (dashboardToken) {
      const tokenRes = await db.query<{ project_id: string | null }>(
        `SELECT public.validate_dashboard_token($1::text) AS project_id`,
        [dashboardToken]
      );
      const candidateProjectId = tokenRes.rows[0]?.project_id;
      if (candidateProjectId && (!projectId || candidateProjectId === projectId)) {
        tokenProjectId = candidateProjectId;
      }
    }

    const adminPassed = await hasAdminSession(c, requireAdminAuth);
    if (!adminPassed && !tokenProjectId) {
      return c.json({ error: "Workspace locked", errorCode: "unauthorized" }, 401);
    }

    let scopedEmotions = emotions;
    if (!adminPassed && tokenProjectId && emotions.length > 0) {
      const allowedRes = await db.query<{ emotion: string }>(
        `SELECT DISTINCT lower(trim(emotional_response)) AS emotion
         FROM public.stories
         WHERE st_project_id = $1::uuid
           AND emotional_response IS NOT NULL
           AND trim(emotional_response) <> ''`,
        [tokenProjectId]
      );
      const allowedSet = new Set(allowedRes.rows.map((r) => r.emotion));
      scopedEmotions = emotions.filter((e) => allowedSet.has(e.trim().toLowerCase()));
    }

    try {
      const results = await runBatchSentiment(
        db,
        tokenEncryptionKey,
        scopedEmotions,
        c.req.raw.signal
      );
      return c.json({ results });
    } catch (err) {
      return handleAiError(c, err);
    }
  });

  router.post("/interviewer", publicAiRateLimit, async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body", errorCode: "bad_request" }, 400);
    }

    const parsed = interviewerRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        { error: parsed.error.errors[0]?.message || "Invalid interviewer request", errorCode: "bad_request" },
        400
      );
    }

    const req = parsed.data;
    const isAdminSession = await hasAdminSession(c, requireAdminAuth);
    let validatedProjectId = req.projectId;

    if (!isAdminSession) {
      if (!req.formId) {
        return c.json({ error: "Workspace locked", errorCode: "unauthorized" }, 401);
      }
      if (req.prompt.length > 10_000) {
        return c.json({ error: "Prompt exceeds public limit", errorCode: "bad_request" }, 400);
      }
      const form = await resolveActiveForm(db, req.formId);
      if (!form.ok) {
        if (form.reason === "not_found") {
          return c.json({ error: "Invalid form identifier", errorCode: "unauthorized" }, 401);
        }
        return c.json({ error: "This collection form is not active", errorCode: "forbidden" }, 403);
      }
      validatedProjectId = form.projectId;
    }

    try {
      const cfg = await resolveLlmConfig(db, tokenEncryptionKey);
      if (!isAdminSession && !cfg.publicInterviewerAiEnabled) {
        return c.json({ response: null, skipped: true, reason: "disabled" });
      }
      if (!cfg.apiKey && isDefaultOpenAiBaseUrl(cfg.baseUrl)) {
        return c.json({ response: null, skipped: true, reason: "unconfigured" });
      }

      const safeLanguage =
        req.language && BCP47_TAG_RE.test(req.language) ? req.language.toUpperCase() : "";

      const [promptMap, publicStoryQuestion] = await Promise.all([
        loadPromptMap(db),
        !isAdminSession && validatedProjectId
          ? loadPublicStoryQuestion(db, validatedProjectId, req.language)
          : Promise.resolve(""),
      ]);

      const effectiveContext = isAdminSession ? req.projectContext || "" : "";
      const effectiveStoryQuestion = isAdminSession
        ? req.storyQuestion || ""
        : publicStoryQuestion;
      const langDirective = safeLanguage
        ? `CONDUCT THIS INTERVIEW ENTIRELY IN ${safeLanguage}.`
        : "";
      const systemPrompt = [
        langDirective,
        INTERVIEWER_CRITICAL_CONSTRAINTS,
        promptMap.get("interviewer_system_prompt") || "",
        effectiveStoryQuestion ? `Main Story Question: "${effectiveStoryQuestion}"` : "",
        effectiveContext ? `PROJECT CONTEXT:\n${effectiveContext}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const messages: ChatCompletionMessage[] = [{ role: "system", content: systemPrompt }];
      // shortcut: relies on existing 120/min/IP publicAiRateLimit without per-session probe tokens
      const priorMessages = (req.conversationHistory ?? [])
        .filter((msg) => msg.role === "user" || msg.role === "assistant")
        .slice(isAdminSession ? -20 : -2);
      for (const msg of priorMessages) {
        messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
      }
      const lastPrior = priorMessages[priorMessages.length - 1];
      if (!lastPrior || lastPrior.role !== "user" || lastPrior.content !== req.prompt) {
        messages.push({ role: "user", content: req.prompt });
      }

      const response = await callChatCompletions({
        baseUrl: cfg.baseUrl,
        apiKey: cfg.apiKey,
        model: cfg.model,
        maxTokens: 250,
        messages,
        signal: c.req.raw.signal,
      });

      return c.json({ response });
    } catch (err) {
      return handleAiError(c, err);
    }
  });

  return router;
}

