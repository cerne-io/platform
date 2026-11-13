import type { Context, MiddlewareHandler } from "hono";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  trustProxy?: boolean;
  keyPrefix?: string;
}

interface NodeEnvLike {
  incoming?: {
    socket?: {
      remoteAddress?: string;
      encrypted?: boolean;
    };
  };
}

const MAX_TRACKED_KEYS = 10_000;

export function getClientIp(c: Context, trustProxy: boolean): string {
  if (trustProxy) {
    // Only trust Fly-Client-IP when actually running inside Fly.io; other proxies do not strip it.
    if (process.env.FLY_APP_NAME) {
      const flyIp = c.req.header("fly-client-ip")?.trim();
      if (flyIp) return flyIp;
    }

    // Proxies append the real client IP on the right; taking the first lets clients spoof it.
    const forwardedFor = c.req.header("x-forwarded-for");
    if (forwardedFor) {
      const parts = forwardedFor
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      const rightmostIp = parts[parts.length - 1];
      if (rightmostIp) return rightmostIp;
    }
  }

  const env = c.env as NodeEnvLike | undefined;
  return env?.incoming?.socket?.remoteAddress || "local";
}

function pruneStore(store: Map<string, RateLimitEntry>, now: number): void {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
  while (store.size >= MAX_TRACKED_KEYS) {
    const oldestKey = store.keys().next().value;
    if (oldestKey === undefined) break;
    store.delete(oldestKey);
  }
}

/**
 * In-memory fixed-window IP rate limiter with bounded cardinality.
 */
export function createRateLimiter(options: RateLimiterOptions): MiddlewareHandler {
  const store = new Map<string, RateLimitEntry>();
  const prefix = options.keyPrefix ?? "rl";
  const trustProxy = Boolean(options.trustProxy);

  return async (c, next) => {
    const now = Date.now();
    const key = `${prefix}:${getClientIp(c, trustProxy)}`;
    const existing = store.get(key);

    if (existing && existing.resetAt > now) {
      existing.count += 1;
      if (existing.count > options.max) {
        const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
        c.header("Retry-After", String(retryAfterSeconds));
        return c.json({ error: "Too many requests" }, 429);
      }
    } else {
      if (store.size >= MAX_TRACKED_KEYS) {
        pruneStore(store, now);
      }
      store.set(key, { count: 1, resetAt: now + options.windowMs });
    }

    await next();
  };
}

