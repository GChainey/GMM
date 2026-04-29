// Apply Drizzle migrations to Neon using the same neon-http driver the app uses.
// Workaround: drizzle-kit migrate hangs on Neon's pooled URL via @neondatabase/serverless's
// websocket adapter, so we run the SQL directly.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

const url =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL;
if (!url) {
  // Local builds without Neon configured: skip cleanly.
  console.warn("[migrate] No DATABASE_URL — skipping (set VERCEL=1 to fail-hard).");
  if (process.env.VERCEL) process.exit(1);
  process.exit(0);
}

const sql = neon(url);

// Wrap network calls so that local DNS quirks don't block `next build` while
// Vercel's build environment (where DNS works) still surfaces real failures.
async function safeRun(label, fn) {
  try {
    return await fn();
  } catch (err) {
    if (process.env.VERCEL) throw err;
    console.warn(
      `[migrate] ${label} failed locally (${err?.cause?.code ?? err?.code ?? err?.message}). Continuing — Vercel will run the migration on next deploy.`,
    );
    process.exit(0);
  }
}

// Track applied migrations in a tiny table — same shape Drizzle uses.
await safeRun("create drizzle schema", () => sql`CREATE SCHEMA IF NOT EXISTS drizzle`);
await safeRun(
  "create __drizzle_migrations",
  () => sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `,
);

const applied = await safeRun(
  "list applied migrations",
  () => sql`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id`,
);
const appliedHashes = new Set(applied.map((r) => r.hash));

const dir = path.resolve("drizzle");
const files = (await readdir(dir))
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const hash = file.replace(/\.sql$/, "");
  if (appliedHashes.has(hash)) {
    console.log(`✓ ${file} already applied`);
    continue;
  }
  console.log(`→ applying ${file}`);
  const fullPath = path.join(dir, file);
  const content = await readFile(fullPath, "utf8");
  const statements = content
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await sql.query(stmt);
  }
  await sql`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES (${hash}, ${Date.now()})
  `;
  console.log(`✓ applied ${file} (${statements.length} statements)`);
}

console.log("Done.");
