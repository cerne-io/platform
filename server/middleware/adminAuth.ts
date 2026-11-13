import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import {
  constantTimeStringEqual,
  SESSION_TTL_MS,
  signSessionToken,
  verifySessionToken,
} from "../utils/crypto.ts";

export const ADMIN_COOKIE_NAME = "cerne_admin_session";

export interface AdminAuthConfig {
  adminPassword?: string;
  isProduction: boolean;
  allowUnauthenticatedAdmin: boolean;
  trustProxy: boolean;
  sessionKey: Buffer;
}

interface AuthStatus {
  passwordRequired: boolean;
  unlocked: boolean;
  unconfigured?: boolean;
}

interface NodeSocketEnv {
  incoming?: {
    socket?: {
      encrypted?: boolean;
    };
  };
}

function isHttpsRequest(c: Context, trustProxy: boolean): boolean {
  const env = c.env as NodeSocketEnv | undefined;
  if (env?.incoming?.socket?.encrypted) {
    return true;
  }

  if (trustProxy) {
    const proto = c.req.header("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
    if (proto === "https") return true;
  }

  return c.req.url.startsWith("https://");
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const MAX_REVOKED_TOKENS = 1000;

function isCrossOriginBrowserMutation(c: Context): boolean {
  if (SAFE_METHODS.has(c.req.method.toUpperCase())) return false;
  const secFetchSite = c.req.header("sec-fetch-site")?.toLowerCase();
  if (secFetchSite === "cross-site" || secFetchSite === "same-site") {
    return true;
  }
  const origin = c.req.header("origin");
  const host = c.req.header("host");
  if (origin && host) {
    try {
      return new URL(origin).host !== host;
    } catch {
      return true;
    }
  }
  return false;
}

function evaluateAuthStatus(
  c: Context,
  config: AdminAuthConfig,
  revokedTokens: Set<string>
): AuthStatus {
  const password = config.adminPassword?.trim();
  if (!password) {
    if (config.isProduction && !config.allowUnauthenticatedAdmin) {
      return { passwordRequired: true, unconfigured: true, unlocked: false };
    }
    return { passwordRequired: false, unlocked: true };
  }

  const cookieToken = getCookie(c, ADMIN_COOKIE_NAME);
  const unlocked = Boolean(
    cookieToken &&
      !revokedTokens.has(cookieToken) &&
      verifySessionToken(config.sessionKey, cookieToken)
  );
  return { passwordRequired: true, unlocked };
}

export function createAdminAuth(config: AdminAuthConfig): {
  requireAdminAuth: MiddlewareHandler;
  statusHandler: (c: Context) => Response;
  unlockHandler: (c: Context) => Promise<Response>;
  logoutHandler: (c: Context) => Response;
} {
  // shortcut: single-instance in-memory revocation set clears on server restart
  const revokedTokens = new Set<string>();

  const requireAdminAuth: MiddlewareHandler = async (c, next) => {
    const status = evaluateAuthStatus(c, config, revokedTokens);
    if (!status.unlocked) {
      return c.json(
        {
          error: status.unconfigured
            ? "Admin password is not configured"
            : "Workspace locked",
        },
        401
      );
    }
    if (isCrossOriginBrowserMutation(c)) {
      return c.json({ error: "Cross-origin request blocked" }, 403);
    }
    await next();
  };

  const statusHandler = (c: Context): Response => {
    return c.json(evaluateAuthStatus(c, config, revokedTokens));
  };

  const unlockHandler = async (c: Context): Promise<Response> => {
    const configuredPassword = config.adminPassword?.trim();
    if (!configuredPassword) {
      if (config.isProduction && !config.allowUnauthenticatedAdmin) {
        return c.json({ error: "Workspace password is not configured" }, 503);
      }
      return c.json({ unlocked: true });
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const candidate =
      typeof body === "object" &&
      body !== null &&
      "password" in body &&
      typeof (body as { password?: unknown }).password === "string"
        ? (body as { password: string }).password
        : null;

    if (!candidate || !constantTimeStringEqual(candidate, configuredPassword)) {
      return c.json({ error: "Invalid workspace password" }, 401);
    }

    const token = signSessionToken(config.sessionKey);
    setCookie(c, ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
      secure: isHttpsRequest(c, config.trustProxy),
    });

    return c.json({ unlocked: true });
  };

  const logoutHandler = (c: Context): Response => {
    const cookieToken = getCookie(c, ADMIN_COOKIE_NAME);
    if (cookieToken) {
      if (revokedTokens.size >= MAX_REVOKED_TOKENS) {
        const oldest = revokedTokens.values().next().value;
        if (oldest) revokedTokens.delete(oldest);
      }
      revokedTokens.add(cookieToken);
    }
    deleteCookie(c, ADMIN_COOKIE_NAME, {
      path: "/",
      secure: isHttpsRequest(c, config.trustProxy),
    });
    return c.json({ ok: true });
  };

  return {
    requireAdminAuth,
    statusHandler,
    unlockHandler,
    logoutHandler,
  };
}

