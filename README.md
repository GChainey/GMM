# God Mode May

A monthly ritual of solemn pledges. Pledge the daily activities you'll perform every day of May 2026; complete each one to ascend, fall short and you fall.

Built with Next.js 16, Tailwind v4 + shadcn/ui (Renaissance theme), Clerk auth, Neon Postgres + Drizzle, and Vercel Blob.

## Local development

Requires **Node 24**.

```bash
nvm use 24
npm install
cp .env.example .env.local   # then fill in values
npm run db:generate          # already committed; regen if you change db/schema.ts
npm run db:migrate           # apply migrations to Neon
npm run dev
```

Open <http://localhost:3000>.

## Provider setup (one-time)

1. **Clerk** — <https://dashboard.clerk.com> → create application → copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` into `.env.local`.
2. **Neon** — <https://console.neon.tech> → create project → copy the **pooled** connection string into `DATABASE_URL`. Run `npm run db:migrate`.
3. **Vercel Blob** — In your Vercel dashboard → Storage → create a Blob store → copy `BLOB_READ_WRITE_TOKEN`. Photo proof uploads degrade gracefully when this is unset.
4. **Clerk webhook (production)** — Add endpoint `https://<your-domain>/api/webhooks/clerk` for `user.created` and `user.updated`. Copy the signing secret into `CLERK_WEBHOOK_SIGNING_SECRET`. Local dev syncs users via a fallback in `lib/auth.ts#ensureUserRow`, so the webhook is only required in production.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run db:generate` | Generate Drizzle migrations from `db/schema.ts` |
| `npm run db:migrate` | Apply migrations to the configured Neon DB |
| `npm run db:push` | Push schema directly (skip migration files) |
| `npm run db:studio` | Drizzle Studio |

## Architecture (one-pager)

- **Routes** — `app/(marketing)/page.tsx` is public, everything in `app/(app)/*` is auth-gated by `middleware.ts`. API webhook at `app/api/webhooks/clerk/route.ts`.
- **Data model** (`db/schema.ts`) — `users`, `groups`, `groupMemberships`, `pledges`, `activities`, `dailyCheckins`. Status (`ascending` / `fallen` / `ascended`) is derived in `lib/status.ts`, never stored.
- **The Pantheon** (`/groups/[slug]`) — every member, their pledge/reward/punishment, and a 31-day grid of their daily check-ins. Gold = done, crimson = miss, divine blue = pending today.
- **Daily Rite** (`/check-in`) — toggle each activity completed; optionally upload photo proof via Vercel Blob. Idempotent on `(user, activity, date)`.
- **Lock** — pledges become read-only at `2026-05-01 00:00 UTC` (see `lib/dates.ts#lockDateForGroup`).

## Deploying to Vercel

1. Push this branch and connect the repo as a new Vercel project.
2. Set the env vars from `.env.example` in the Vercel project settings.
3. Add the Clerk webhook endpoint in production (see above).
4. Deploy. Run migrations against the production Neon DB once: `DATABASE_URL=… npm run db:migrate`.
