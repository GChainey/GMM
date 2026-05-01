<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Always update the codex

Every PR must add (or extend) an entry in `lib/changelog.ts`. That file is what `/changelog` (the in-app Codex) renders, so it has to stay current. Match the existing in-lore Renaissance tone. Pure infra/tooling PRs with no user-visible effect can be a "Quietly: …" bullet on the latest entry rather than a new one — but they still appear. Treat a PR without a changelog touch as incomplete.

# Push, then stop — never auto-merge

After pushing a branch and opening a PR, drive CI to green and **stop there**. Post the PR URL and the Vercel preview URL, then wait. Gareth tests on the preview/staging before committing to an idea, and he merges the PR himself.

Do **not** run `gh pr merge`, do **not** promote to production, do **not** trigger any deploy. "Looks good", "ship it", or "merge it" from Gareth in the conversation is the only green light. Anything ambiguous means ask first.

This rule overrides any older global instruction that authorized auto-merge across every workspace.
