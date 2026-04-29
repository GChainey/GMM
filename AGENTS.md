<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Always update the codex

Every PR must add (or extend) an entry in `lib/changelog.ts`. That file is what `/changelog` (the in-app Codex) renders, so it has to stay current. Match the existing in-lore Renaissance tone. Pure infra/tooling PRs with no user-visible effect can be a "Quietly: …" bullet on the latest entry rather than a new one — but they still appear. Treat a PR without a changelog touch as incomplete.
