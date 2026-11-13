import type { PGlite } from "@electric-sql/pglite";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const SYSTEM_SECRET_KEY = "_system.app_secret";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_CIPHER_PREFIX = "enc:v1:";

export interface AppKeys {
  sessionKey: Buffer;
  tokenEncryptionKey: Buffer;
}

function deriveSubkey(masterSecret: Buffer, info: string): Buffer {
  return Buffer.from(hkdfSync("sha256", masterSecret, Buffer.alloc(0), info, 32));
}

/**
 * Resolves the 32-byte master secret from SESSION_SECRET or a persisted
 * workspace_settings installation key, then derives isolated subkeys.
 */
export async function resolveAppKeys(
  db: PGlite,
  sessionSecretEnv: string | undefined = process.env.SESSION_SECRET
): Promise<AppKeys> {
  const trimmedEnv = sessionSecretEnv?.trim();
  let masterSecret: Buffer;

  if (trimmedEnv) {
    masterSecret = createHash("sha256").update(trimmedEnv, "utf8").digest();
  } else {
    const existing = await db.query<{ value: unknown }>(
      `SELECT value FROM public.workspace_settings WHERE key = $1 LIMIT 1`,
      [SYSTEM_SECRET_KEY]
    );
    let hexSecret =
      typeof existing.rows[0]?.value === "string" ? existing.rows[0].value : null;

    if (!hexSecret || !/^[0-9a-f]{64}$/i.test(hexSecret)) {
      const candidate = randomBytes(32).toString("hex");
      await db.query(
        `INSERT INTO public.workspace_settings (key, value)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO NOTHING`,
        [SYSTEM_SECRET_KEY, JSON.stringify(candidate)]
      );
      const reread = await db.query<{ value: unknown }>(
        `SELECT value FROM public.workspace_settings WHERE key = $1 LIMIT 1`,
        [SYSTEM_SECRET_KEY]
      );
      hexSecret =
        typeof reread.rows[0]?.value === "string" ? reread.rows[0].value : candidate;
    }

    masterSecret = Buffer.from(hexSecret, "hex");
  }

  return {
    sessionKey: deriveSubkey(masterSecret, "cerne-admin-session-v1"),
    tokenEncryptionKey: deriveSubkey(masterSecret, "cerne-dashboard-token-v1"),
  };
}

/**
 * Constant-time string comparison via fixed-length SHA-256 digests so lengths do not leak.
 */
export function constantTimeStringEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a, "utf8").digest();
  const hashB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(hashA, hashB);
}

export function signSessionToken(signingKey: Buffer, nowMs: number = Date.now()): string {
  const payload = `${nowMs}.${randomBytes(16).toString("hex")}`;
  const mac = createHmac("sha256", signingKey).update(payload, "utf8").digest("hex");
  return `${payload}.${mac}`;
}

export function verifySessionToken(
  signingKey: Buffer,
  token: string,
  nowMs: number = Date.now()
): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [issuedAtRaw, nonce, macHex] = parts;
  if (!issuedAtRaw || !nonce || !macHex || !/^[0-9a-f]{64}$/i.test(macHex)) {
    return false;
  }

  const payload = `${issuedAtRaw}.${nonce}`;
  const expectedMac = createHmac("sha256", signingKey).update(payload, "utf8").digest();
  const providedMac = Buffer.from(macHex, "hex");
  if (providedMac.length !== expectedMac.length || !timingSafeEqual(providedMac, expectedMac)) {
    return false;
  }

  const issuedAtMs = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAtMs)) return false;
  if (issuedAtMs > nowMs + 60_000) return false;
  return nowMs - issuedAtMs < SESSION_TTL_MS;
}

export function encryptSecretValue(encryptionKey: Buffer, plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${TOKEN_CIPHER_PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecretValue(encryptionKey: Buffer, stored: string): string {
  if (!stored.startsWith(TOKEN_CIPHER_PREFIX)) {
    throw new Error("Unsupported encrypted token format");
  }

  const body = stored.slice(TOKEN_CIPHER_PREFIX.length);
  const parts = body.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted token payload");
  }

  const [ivHex, tagHex, cipherHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(cipherHex, "hex");
  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error("Invalid encrypted token parameters");
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv, {
    authTagLength: 16,
  });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

