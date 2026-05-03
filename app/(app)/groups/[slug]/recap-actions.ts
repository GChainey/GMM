"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { groupDailyPosts, groupMemberships, groups } from "@/db/schema";
import { ensureUserRow, requireUserId } from "@/lib/auth";
import { isChallengeDate } from "@/lib/dates";

const postSchema = z.object({
  groupId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  body: z.string().max(1500),
  photoUrl: z.string().url().nullable(),
});

async function ensureMember(groupId: string, userId: string) {
  const [row] = await db
    .select({ id: groupMemberships.id })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.userId, userId),
      ),
    )
    .limit(1);
  if (!row) {
    throw new Error("Only mortals of this pantheon may post.");
  }
}

export async function saveCollectivePostAction(input: {
  groupId: string;
  date: string;
  body: string;
  photoUrl: string | null;
}) {
  const userId = await requireUserId();
  await ensureUserRow();
  const data = postSchema.parse(input);

  if (!isChallengeDate(data.date)) {
    throw new Error("Only May dates may bear a recap.");
  }
  await ensureMember(data.groupId, userId);

  const [group] = await db
    .select({ slug: groups.slug })
    .from(groups)
    .where(eq(groups.id, data.groupId))
    .limit(1);
  if (!group) throw new Error("Pantheon not found.");

  const trimmed = data.body.trim();

  const existing = await db
    .select()
    .from(groupDailyPosts)
    .where(
      and(
        eq(groupDailyPosts.groupId, data.groupId),
        eq(groupDailyPosts.date, data.date),
      ),
    )
    .limit(1);

  if (trimmed.length === 0 && !data.photoUrl) {
    if (existing.length > 0) {
      await db
        .delete(groupDailyPosts)
        .where(eq(groupDailyPosts.id, existing[0].id));
    }
  } else if (existing.length === 0) {
    await db.insert(groupDailyPosts).values({
      groupId: data.groupId,
      date: data.date,
      body: trimmed,
      photoUrl: data.photoUrl,
      authorUserId: userId,
    });
  } else {
    await db
      .update(groupDailyPosts)
      .set({
        body: trimmed,
        photoUrl: data.photoUrl,
        authorUserId: userId,
        updatedAt: new Date(),
      })
      .where(eq(groupDailyPosts.id, existing[0].id));
  }

  revalidatePath(`/groups/${group.slug}`);
}
