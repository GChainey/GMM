// Pick a port for `next dev`.
// - If CONDUCTOR_PORT is set (Conductor reserves a stable port per workspace),
//   bind to exactly that port. Hard-fail if it's taken — Conductor's preview
//   URL is pinned to it, so silently drifting would be worse than a clear error.
// - Otherwise, find the first unused port from START_PORT (default 3000) upward.
//   This is what plain `npm run dev` outside Conductor does.
//
// Usage:
//   npm run dev                     # auto-pick from 3000 (or CONDUCTOR_PORT if set)
//   npm run dev -- --port=3100      # auto-pick from 3100
//   START_PORT=3100 npm run dev

import { createServer } from "node:net";
import { spawn } from "node:child_process";

const argPort = process.argv
  .find((a) => a.startsWith("--port="))
  ?.split("=")[1];
const conductorPort = process.env.CONDUCTOR_PORT;
const PINNED_PORT = argPort ? null : conductorPort ? Number(conductorPort) : null;
const START_PORT = Number(argPort ?? process.env.START_PORT ?? 3000);
const MAX_TRIES = 50;

const portToValidate = PINNED_PORT ?? START_PORT;
if (!Number.isInteger(portToValidate) || portToValidate < 1 || portToValidate > 65535) {
  console.error(`Invalid port: ${portToValidate}`);
  process.exit(1);
}

// Probe both 0.0.0.0 (IPv4 wildcard) and :: (IPv6 wildcard) — Next.js binds
// to the IPv6 wildcard by default, which also reserves the IPv4 port on most
// systems. A single 127.0.0.1 probe misses that, so we test both explicitly.
function tryListen(port, host) {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ port, host, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function isFree(port) {
  if (!(await tryListen(port, "0.0.0.0"))) return false;
  if (!(await tryListen(port, "::"))) return false;
  return true;
}

async function findPort() {
  for (let i = 0; i < MAX_TRIES; i++) {
    const port = START_PORT + i;
    if (port > 65535) break;
    if (await isFree(port)) return port;
  }
  throw new Error(
    `No free port found in range ${START_PORT}–${START_PORT + MAX_TRIES - 1}`,
  );
}

async function resolvePort() {
  if (PINNED_PORT !== null) {
    if (await isFree(PINNED_PORT)) return PINNED_PORT;
    throw new Error(
      `CONDUCTOR_PORT=${PINNED_PORT} is already in use. Stop whatever is holding it (lsof -nP -iTCP:${PINNED_PORT} -sTCP:LISTEN) — refusing to drift to another port because Conductor's preview URL is pinned to ${PINNED_PORT}.`,
    );
  }
  return findPort();
}

const port = await resolvePort();
const url = `http://localhost:${port}`;

console.log("");
console.log(`▲ Starting Next.js dev server on ${url}`);
console.log("");

const child = spawn("npx", ["next", "dev", "-p", String(port)], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: String(port),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? url,
  },
});

const forward = (sig) => () => {
  if (!child.killed) child.kill(sig);
};
process.on("SIGINT", forward("SIGINT"));
process.on("SIGTERM", forward("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
