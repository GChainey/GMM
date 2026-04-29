// Pick the first unused port from START_PORT upward and run `next dev` on it.
// Useful in Conductor where many workspaces run in parallel and would otherwise
// collide on port 3000.
//
// Usage:
//   npm run dev:port               # auto-pick from 3000
//   npm run dev:port -- --port=3100  # auto-pick from 3100
//   START_PORT=3100 npm run dev:port

import { createServer } from "node:net";
import { spawn } from "node:child_process";

const argPort = process.argv
  .find((a) => a.startsWith("--port="))
  ?.split("=")[1];
const START_PORT = Number(argPort ?? process.env.START_PORT ?? 3000);
const MAX_TRIES = 50;

if (!Number.isInteger(START_PORT) || START_PORT < 1 || START_PORT > 65535) {
  console.error(`Invalid start port: ${START_PORT}`);
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

const port = await findPort();
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
