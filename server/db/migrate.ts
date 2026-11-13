import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedDatabase, type SeedOptions } from "./seed.ts";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// shortcut: Low shared_buffers fits 512MB RAM hosts; raise if profiling shows buffer cache misses on >10k stories
const PGLITE_OPTIONS = {
  startParams: [
    ...PGlite.defaultStartParams,
    "-c", "shared_buffers=16MB",
    "-c", "work_mem=1MB",
    "-c", "maintenance_work_mem=8MB",
  ],
};

/**
 * Boots PGlite, applies the idempotent SQL schema, and runs first-boot seeding.
 * Omit `dataDir` for an ephemeral in-memory instance (used in tests).
 */
export async function initDatabase(
  dataDir?: string,
  options: SeedOptions = {}
): Promise<PGlite> {
  const db = dataDir ? new PGlite(dataDir, PGLITE_OPTIONS) : new PGlite(PGLITE_OPTIONS);
  await db.waitReady;

  const schemaSql = readFileSync(path.join(currentDir, "schema.sql"), "utf8");
  await db.exec(schemaSql);
  await seedDatabase(db, options);

  return db;
}

