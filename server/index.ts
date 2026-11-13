import type { PGlite } from "@electric-sql/pglite";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { createHmac } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initDatabase } from "./db/migrate.ts";
import { createAdminAuth } from "./middleware/adminAuth.ts";
import { createRateLimiter } from "./middleware/rateLimit.ts";
import { createDbAdapterRoutes } from "./routes/dbAdapter.ts";
import { createAiRoutes } from "./routes/ai.ts";
import { createPublicRoutes } from "./routes/public.ts";
import { createRpcRoutes } from "./routes/rpc.ts";
import { createSettingsRoutes } from "./routes/settings.ts";
import { resolveAppKeys } from "./utils/crypto.ts";

export interface ServerConfig {
  adminPassword?: string;
  sessionSecret?: string;
  isProduction?: boolean;
  allowUnauthenticatedAdmin?: boolean;
  trustProxy?: boolean;
  distDir?: string;
  /** Override rate limit thresholds (useful in tests). */
  rateLimits?: {
    unlockMax?: number;
    publicSubmitMax?: number;
    publicRpcMax?: number;
    windowMs?: number;
  };
}

export async function createApp(
  db: PGlite,
  config: ServerConfig = {}
): Promise<Hono> {
  const isProduction =
    config.isProduction ?? process.env.NODE_ENV === "production";
  const adminPassword =
    config.adminPassword !== undefined
      ? config.adminPassword
      : process.env.ADMIN_PASSWORD;
  const allowUnauthenticatedAdmin =
    config.allowUnauthenticatedAdmin ??
    process.env.ALLOW_UNAUTHENTICATED_ADMIN === "true";
  const trustProxy =
    config.trustProxy ?? process.env.TRUST_PROXY === "true";
  const sessionSecret =
    config.sessionSecret !== undefined
      ? config.sessionSecret
      : process.env.SESSION_SECRET;

  const { sessionKey: baseSessionKey, tokenEncryptionKey } = await resolveAppKeys(
    db,
    sessionSecret
  );
  const sessionKey = adminPassword?.trim()
    ? createHmac("sha256", baseSessionKey).update(adminPassword.trim()).digest()
    : baseSessionKey;

  if (!adminPassword?.trim()) {
    if (isProduction && !allowUnauthenticatedAdmin) {
      console.warn(
        "[cerne-server] WARNING: ADMIN_PASSWORD is not set in production. Admin routes are locked (fail-closed) until ADMIN_PASSWORD or ALLOW_UNAUTHENTICATED_ADMIN=true is configured."
      );
    } else {
      console.warn(
        "[cerne-server] WARNING: ADMIN_PASSWORD is unset — running in unauthenticated local mode."
      );
    }
  }

  const app = new Hono();

  app.use("*", async (c, next) => {
    await next();
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
    c.header("X-Frame-Options", "DENY");
    c.header(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' blob: data:; media-src 'self' blob:; img-src 'self' data: https: blob:; worker-src 'self' blob:; frame-src 'self';"
    );
    if (c.req.path.startsWith("/api/")) {
      c.header("Cache-Control", "no-store");
    }
  });

  app.use("/api/*", bodyLimit({ maxSize: 2 * 1024 * 1024 }));

  app.get("/api/health", async (c) => {
    try {
      await db.query("SELECT 1");
      return c.json({ status: "ok", database: "pglite" });
    } catch {
      return c.json({ status: "error", database: "pglite" }, 503);
    }
  });

  const auth = createAdminAuth({
    adminPassword,
    isProduction,
    allowUnauthenticatedAdmin,
    trustProxy,
    sessionKey,
  });

  const windowFifteenMin = config.rateLimits?.windowMs ?? 15 * 60 * 1000;
  const windowOneMin = config.rateLimits?.windowMs ?? 60 * 1000;

  const unlockRateLimit = createRateLimiter({
    windowMs: windowFifteenMin,
    max: config.rateLimits?.unlockMax ?? 10,
    trustProxy,
    keyPrefix: "unlock",
  });
  const submitRateLimit = createRateLimiter({
    windowMs: windowFifteenMin,
    max: config.rateLimits?.publicSubmitMax ?? 300,
    trustProxy,
    keyPrefix: "submit",
  });
  const publicRpcRateLimit = createRateLimiter({
    windowMs: windowOneMin,
    max: config.rateLimits?.publicRpcMax ?? 600,
    trustProxy,
    keyPrefix: "pubrpc",
  });

  app.get("/api/auth/status", (c) => auth.statusHandler(c));
  app.post("/api/auth/unlock", unlockRateLimit, (c) => auth.unlockHandler(c));
  app.post("/api/auth/logout", (c) => auth.logoutHandler(c));

  app.use("/api/public/*", submitRateLimit);
  app.route("/api/public", createPublicRoutes(db));

  app.route(
    "/api/rpc",
    createRpcRoutes({
      db,
      tokenEncryptionKey,
      requireAdminAuth: auth.requireAdminAuth,
      publicRpcRateLimit,
    })
  );

  app.use("/api/db/*", auth.requireAdminAuth);
  app.route("/api/db", createDbAdapterRoutes(db));

  app.use("/api/settings/*", auth.requireAdminAuth);
  app.route("/api/settings", createSettingsRoutes({ db, tokenEncryptionKey }));

  app.route(
    "/api/ai",
    createAiRoutes({
      db,
      tokenEncryptionKey,
      requireAdminAuth: auth.requireAdminAuth,
      publicAiRateLimit: publicRpcRateLimit,
    })
  );

  app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

  const distDir = path.resolve(config.distDir ?? path.join(process.cwd(), "dist"));
  const indexHtmlPath = path.join(distDir, "index.html");
  if (existsSync(indexHtmlPath)) {
    const relativeRoot = path.relative(process.cwd(), distDir) || ".";
    app.use("/*", serveStatic({ root: relativeRoot }));
    const indexHtml = readFileSync(indexHtmlPath, "utf8");
    app.get("*", (c) => {
      c.header("Cache-Control", "no-store");
      return c.html(indexHtml);
    });
  }

  return app;
}

async function main(): Promise<void> {
  const dataDir = path.resolve(process.env.DATA_DIR || "./data/pgdata");
  mkdirSync(path.dirname(dataDir), { recursive: true });

  const seedSampleProject = process.env.SEED_SAMPLE_PROJECT !== "false";
  const db = await initDatabase(dataDir, { seedSampleProject });
  const app = await createApp(db);

  const port = Number(process.env.PORT || 3000);
  const server = serve({
    fetch: app.fetch,
    port,
  });

  console.warn(`[cerne-server] Listening on http://0.0.0.0:${port}`);

  let shuttingDown = false;
  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;

    const forceTimer = setTimeout(() => {
      void db.close().finally(() => process.exit(0));
    }, 4_000);
    forceTimer.unref();

    if ("closeIdleConnections" in server && typeof server.closeIdleConnections === "function") {
      server.closeIdleConnections();
    }
    server.close(() => {
      clearTimeout(forceTimer);
      void db.close().finally(() => process.exit(0));
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

const isDirectExecution =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  main().catch((err) => {
    console.error("[cerne-server] Fatal startup error:", err);
    process.exit(1);
  });
}

