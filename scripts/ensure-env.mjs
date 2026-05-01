// Ensure .env.local exists in this workspace before dev/build runs.
//
// Conductor's setup-workspace.sh only runs at workspace creation. If a
// workspace was created before that script existed, or the durable file
// landed afterwards, the symlink is missing — and the first /dashboard hit
// crashes with "DATABASE_URL is not set". Running this on every dev/build
// makes the bootstrap idempotent: zero cost when already linked, self-heals
// otherwise.
//
// Strategy:
//   1. If .env.local already resolves (symlink target exists, or it's a real
//      file), exit quietly.
//   2. Otherwise, find the durable .env.local at $CONDUCTOR_ROOT_PATH (or the
//      documented fallback) and symlink to it.
//   3. If the durable file doesn't exist, try `vercel env pull` from there.
//   4. If that also fails, exit 0 with clear next-steps. We don't fail-hard:
//      `npm run dev` should still come up so the user can see the message
//      and fix it without a cryptic stack trace.

import { existsSync, lstatSync, readlinkSync, renameSync, symlinkSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";

const CWD = process.cwd();
const WORKSPACE_ENV = path.join(CWD, ".env.local");
const ROOT_PATH =
  process.env.CONDUCTOR_ROOT_PATH ?? path.join(homedir(), "Documents", "projects", "GMM");
const DURABLE_ENV = path.join(ROOT_PATH, ".env.local");

function log(msg) {
  console.log(`[ensure-env] ${msg}`);
}

function alreadyLinkedToDurable() {
  if (!existsSync(WORKSPACE_ENV)) return false;
  try {
    const stat = lstatSync(WORKSPACE_ENV);
    if (stat.isSymbolicLink()) {
      const target = readlinkSync(WORKSPACE_ENV);
      const resolved = path.isAbsolute(target) ? target : path.resolve(CWD, target);
      return resolved === DURABLE_ENV && existsSync(resolved);
    }
    // Real file (not a symlink) — leave it alone. The user opted out of the
    // Conductor sharing convention; we trust them.
    return true;
  } catch {
    return false;
  }
}

function tryVercelPull() {
  const result = spawnSync("vercel", ["env", "pull", "--environment=development", "--yes", DURABLE_ENV], {
    cwd: ROOT_PATH,
    stdio: "inherit",
  });
  return result.status === 0 && existsSync(DURABLE_ENV);
}

if (alreadyLinkedToDurable()) {
  process.exit(0);
}

if (!existsSync(DURABLE_ENV)) {
  log(`No durable .env.local at ${DURABLE_ENV}.`);
  if (spawnSync("which", ["vercel"], { stdio: "ignore" }).status === 0) {
    log(`Trying \`vercel env pull\` from ${ROOT_PATH}...`);
    if (tryVercelPull()) {
      log(`Pulled ${DURABLE_ENV} from Vercel.`);
    } else {
      log("Vercel pull failed (project not linked, or you're not signed in).");
    }
  }
}

if (!existsSync(DURABLE_ENV)) {
  log(`Could not create ${WORKSPACE_ENV}. To unblock:`);
  log(`  1. Copy ${path.join(ROOT_PATH, ".env.example")} → ${DURABLE_ENV}`);
  log(`  2. Fill in DATABASE_URL (Neon) and the Clerk keys.`);
  log(`  3. Re-run \`npm run dev\`.`);
  process.exit(0);
}

// Replace any stale workspace .env.local (real file or broken symlink) with a
// fresh symlink to the durable file.
if (existsSync(WORKSPACE_ENV) || lstatSilently(WORKSPACE_ENV)) {
  const stat = lstatSilently(WORKSPACE_ENV);
  if (stat?.isSymbolicLink()) {
    unlinkSync(WORKSPACE_ENV);
  } else if (stat?.isFile()) {
    const backup = `${WORKSPACE_ENV}.workspace.bak.${Date.now()}`;
    renameSync(WORKSPACE_ENV, backup);
    log(`Existing .env.local backed up to ${path.basename(backup)}`);
  }
}

symlinkSync(DURABLE_ENV, WORKSPACE_ENV);
log(`Linked ${WORKSPACE_ENV} → ${DURABLE_ENV}`);

function lstatSilently(p) {
  try {
    return lstatSync(p);
  } catch {
    return null;
  }
}
