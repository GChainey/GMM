"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureUserRow, requireUserId } from "@/lib/auth";

const feedbackSchema = z.object({
  body: z.string().trim().min(4).max(4000),
});

export async function submitFeedbackAction(input: { body: string }) {
  const userId = await requireUserId();
  await ensureUserRow();
  const data = feedbackSchema.parse(input);

  const repo = process.env.GITHUB_FEEDBACK_REPO ?? "GChainey/GMM";
  const token = process.env.GITHUB_FEEDBACK_TOKEN;
  if (!token) {
    throw new Error(
      "Feedback inbox is not configured yet. Tell Gareth to set GITHUB_FEEDBACK_TOKEN.",
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const displayName = user?.displayName ?? "Unknown mortal";

  const titleSnippet =
    data.body.split(/\r?\n/)[0]?.slice(0, 70).trim() || "Feedback";
  const title = `[Feedback] ${titleSnippet}`;
  const body = [
    data.body,
    "",
    "---",
    `Submitted from God Mode May by **${displayName}** (\`${userId}\`).`,
  ].join("\n");

  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      body,
      labels: ["feedback", "user-submitted"],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = "";
    try {
      const json = (await res.json()) as { message?: string };
      detail = json.message ?? "";
    } catch {
      // ignore
    }
    throw new Error(
      `GitHub rejected the feedback (${res.status}${detail ? `: ${detail}` : ""}). Try again, or message Gareth directly.`,
    );
  }

  const json = (await res.json()) as { html_url?: string; number?: number };
  return { url: json.html_url ?? null, number: json.number ?? null };
}
