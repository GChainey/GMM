#!/bin/bash
# Conductor workspace setup — runs once per new workspace via conductor.json.
#
# 1. npm install
# 2. Make .env.local persist across worktrees by symlinking it to the
#    durable file at $CONDUCTOR_ROOT_PATH/.env.local (the user's main
#    checkout). Edit one file → every workspace sees it.
# 3. If the durable file is missing, try `vercel env pull` to fetch it from
#    Vercel's "development" env. Falls back to clear instructions.

set -e

echo "[setup] Installing dependencies..."
npm install

ROOT_PATH="${CONDUCTOR_ROOT_PATH:-$HOME/Documents/projects/GMM}"
DURABLE_ENV="$ROOT_PATH/.env.local"
WORKSPACE_ENV=".env.local"

if [ ! -f "$DURABLE_ENV" ]; then
  echo "[setup] No durable .env.local at $DURABLE_ENV"
  if command -v vercel >/dev/null 2>&1; then
    echo "[setup] Trying \`vercel env pull\` to populate it from Vercel..."
    if (cd "$ROOT_PATH" && vercel env pull --environment=development --yes "$DURABLE_ENV") 2>/dev/null; then
      echo "[setup] Pulled $DURABLE_ENV from Vercel."
    else
      echo "[setup] Vercel pull failed (project not linked, or you're not signed in)."
    fi
  fi
fi

if [ ! -f "$DURABLE_ENV" ]; then
  cat <<EOF
[setup] No .env.local was created. To unblock the workspace:
  1. Copy $ROOT_PATH/.env.example → $DURABLE_ENV
  2. Fill in DATABASE_URL (Neon) and the Clerk keys.
  3. Re-run \`bash scripts/setup-workspace.sh\` or \`ln -sfn "$DURABLE_ENV" "$WORKSPACE_ENV"\` here.
The durable file lives outside this worktree, so future Conductor workspaces
will reuse it automatically.
EOF
  exit 0
fi

# Symlink (or replace) the workspace .env.local. Skip if it's already the
# correct symlink so re-running is idempotent.
if [ -L "$WORKSPACE_ENV" ] && [ "$(readlink "$WORKSPACE_ENV")" = "$DURABLE_ENV" ]; then
  echo "[setup] $WORKSPACE_ENV already linked to $DURABLE_ENV"
else
  if [ -e "$WORKSPACE_ENV" ] && [ ! -L "$WORKSPACE_ENV" ]; then
    backup="$WORKSPACE_ENV.workspace.bak.$(date +%s)"
    echo "[setup] Existing $WORKSPACE_ENV backed up to $backup"
    mv "$WORKSPACE_ENV" "$backup"
  fi
  ln -sfn "$DURABLE_ENV" "$WORKSPACE_ENV"
  echo "[setup] Linked $WORKSPACE_ENV → $DURABLE_ENV"
fi

echo "[setup] Done. \`npm run dev\` should now work."
