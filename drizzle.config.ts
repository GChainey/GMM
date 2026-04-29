import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Drizzle CLI doesn't auto-load .env.local — load it explicitly so DATABASE_URL is available.
loadEnv({ path: ".env.local" });
loadEnv(); // fall back to .env for CI environments

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Drizzle migrations need a direct connection — pgbouncer/pooled URLs hang on lock acquisition.
    url:
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.DATABASE_URL ??
      "",
  },
  strict: true,
  verbose: true,
});
