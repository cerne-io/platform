import type { PGlite } from "@electric-sql/pglite";
import { decryptSecretValue } from "./crypto.ts";

export const DEFAULT_LLM_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_LLM_MODEL = "gpt-4o-mini";

export const LLM_API_KEY_SETTING = "_system.llm_api_key";
export const LLM_BASE_URL_SETTING = "llm_base_url";
export const LLM_MODEL_SETTING = "llm_model";
export const PUBLIC_INTERVIEWER_AI_SETTING = "public_interviewer_ai_enabled";

export interface ResolvedLlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  keySource: "database" | "env" | "none";
  publicInterviewerAiEnabled: boolean;
}

export class LlmCallError extends Error {
  readonly statusCode: 400 | 429 | 502 | 504;
  readonly errorCode: string;

  constructor(message: string, statusCode: 400 | 429 | 502 | 504, errorCode: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export function normalizeBaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const parsed = new URL(trimmed);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Base URL must use http:// or https://");
  }
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "metadata.google.internal" ||
    host === "metadata.goog" ||
    host.startsWith("169.254.") ||
    host.startsWith("::ffff:a9fe:") ||
    /^fe[89ab][0-9a-f]:/.test(host) ||
    host === "fd00:ec2::254"
  ) {
    throw new Error("Base URL host is not permitted");
  }
  return trimmed.replace(/\/+$/, "");
}

export function isDefaultOpenAiBaseUrl(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).hostname.toLowerCase() === "api.openai.com";
  } catch {
    return false;
  }
}

export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export async function resolveLlmConfig(
  db: PGlite,
  tokenEncryptionKey: Buffer
): Promise<ResolvedLlmConfig> {
  const res = await db.query<{ key: string; value: unknown }>(
    `SELECT key, value FROM public.workspace_settings WHERE key = ANY($1::text[])`,
    [[LLM_API_KEY_SETTING, LLM_BASE_URL_SETTING, LLM_MODEL_SETTING, PUBLIC_INTERVIEWER_AI_SETTING]]
  );

  const map = new Map<string, unknown>();
  for (const row of res.rows) {
    map.set(row.key, row.value);
  }

  const storedEncryptedKey = map.get(LLM_API_KEY_SETTING);
  let dbApiKey = "";
  if (typeof storedEncryptedKey === "string" && storedEncryptedKey.length > 0) {
    try {
      dbApiKey = decryptSecretValue(tokenEncryptionKey, storedEncryptedKey).trim();
    } catch {
      dbApiKey = "";
    }
  }

  const envApiKey = process.env.LLM_API_KEY?.trim() || "";
  const apiKey = dbApiKey || envApiKey;
  const keySource: ResolvedLlmConfig["keySource"] = dbApiKey
    ? "database"
    : envApiKey
      ? "env"
      : "none";

  const rawDbBaseUrl = map.get(LLM_BASE_URL_SETTING);
  const candidateBaseUrl =
    typeof rawDbBaseUrl === "string" && rawDbBaseUrl.trim()
      ? rawDbBaseUrl.trim()
      : process.env.LLM_BASE_URL?.trim() || DEFAULT_LLM_BASE_URL;

  let baseUrl = DEFAULT_LLM_BASE_URL;
  try {
    baseUrl = normalizeBaseUrl(candidateBaseUrl);
  } catch {
    baseUrl = DEFAULT_LLM_BASE_URL;
  }

  const rawDbModel = map.get(LLM_MODEL_SETTING);
  const model =
    typeof rawDbModel === "string" && rawDbModel.trim()
      ? rawDbModel.trim()
      : process.env.LLM_MODEL?.trim() || DEFAULT_LLM_MODEL;

  const publicInterviewerAiEnabled = map.get(PUBLIC_INTERVIEWER_AI_SETTING) === true;

  return { apiKey, baseUrl, model, keySource, publicInterviewerAiEnabled };
}

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callChatCompletions(options: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatCompletionMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<string> {
  const { baseUrl, apiKey, model, messages, temperature = 0.7, maxTokens, signal } = options;

  if (!apiKey && isDefaultOpenAiBaseUrl(baseUrl)) {
    throw new LlmCallError(
      "LLM API key is not configured. Open Workspace Settings to add one.",
      400,
      "api_key_missing"
    );
  }

  const timeoutSignal = AbortSignal.timeout(45_000);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      redirect: "error",
      body: JSON.stringify({
        model,
        messages,
        temperature,
        ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
      }),
      signal: combinedSignal,
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      if (signal?.aborted) {
        throw err;
      }
      throw new LlmCallError("LLM request timed out", 504, "gateway_timeout");
    }
    throw new LlmCallError(
      err instanceof Error ? `Cannot reach LLM provider: ${err.message}` : "LLM network error",
      502,
      "service_unavailable"
    );
  }

  if (!response.ok) {
    let providerMessage = `Upstream provider returned HTTP ${response.status}`;
    try {
      const errJson = (await response.json()) as {
        error?: { message?: string } | string;
        message?: string;
      };
      if (typeof errJson?.error === "string") {
        providerMessage = errJson.error;
      } else if (errJson?.error?.message) {
        providerMessage = errJson.error.message;
      } else if (errJson?.message) {
        providerMessage = errJson.message;
      }
    } catch {
      // Ignore upstream non-JSON body
    }

    if (response.status === 401 || response.status === 403) {
      throw new LlmCallError(providerMessage, 400, "invalid_api_key");
    }
    if (response.status === 429) {
      throw new LlmCallError(providerMessage, 429, "rate_limited");
    }
    if (response.status === 504) {
      throw new LlmCallError(providerMessage, 504, "gateway_timeout");
    }
    throw new LlmCallError(providerMessage, 502, "service_unavailable");
  }

  let json: { choices?: Array<{ message?: { content?: string | null } }> };
  try {
    json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
  } catch {
    throw new LlmCallError("Invalid completion payload from LLM provider", 502, "invalid_response");
  }
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new LlmCallError("Invalid completion payload from LLM provider", 502, "invalid_response");
  }

  return content;
}

