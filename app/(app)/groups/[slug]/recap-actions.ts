"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  dailyCheckins,
  groupDailyPosts,
  groupMemberships,
  groupProofVotes,
  groups,
} from "@/db/schema";
import { ensureUserRow, requireUserId } from "@/lib/auth";
import { isChallengeDate } from "@/lib/dates";

const postSchema = z.object({
  groupId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  body: z.string().max(1500),
});

const voteSchema = z.object({
  groupId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkinId: z.string().min(1),
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

async function groupSlug(groupId: string): Promise<string> {
  const [group] = await db
    .select({ slug: groups.slug })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) throw new Error("Pantheon not found.");
  return group.slug;
}

export async function saveCollectivePostAction(input: {
  groupId: string;
  date: string;
  body: string;
}) {
  const userId = await requireUserId();
  await ensureUserRow();
  const data = postSchema.parse(input);

  if (!isChallengeDate(data.date)) {
    throw new Error("Only May dates may bear a recap.");
  }
  await ensureMember(data.groupId, userId);
  const slug = await groupSlug(data.groupId);

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

  if (trimmed.length === 0) {
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
      authorUserId: userId,
    });
  } else {
    await db
      .update(groupDailyPosts)
      .set({
        body: trimmed,
        authorUserId: userId,
        updatedAt: new Date(),
      })
      .where(eq(groupDailyPosts.id, existing[0].id));
  }

  revalidatePath(`/groups/${slug}`);
}

export async function castProofVoteAction(input: {
  groupId: string;
  date: string;
  checkinId: string;
}) {
  const userId = await requireUserId();
  await ensureUserRow();
  const data = voteSchema.parse(input);

  if (!isChallengeDate(data.date)) {
    throw new Error("Only May proofs may be honored.");
  }
  await ensureMember(data.groupId, userId);

  const [checkin] = await db
    .select({ id: dailyCheckins.id, date: dailyCheckins.date })
    .from(dailyCheckins)
    .where(eq(dailyCheckins.id, data.checkinId))
    .limit(1);
  if (!checkin) throw new Error("Proof not found.");
  const checkinDate =
    typeof checkin.date === "string" ? checkin.date : String(checkin.date);
  if (checkinDate !== data.date) {
    throw new Error("Proof does not belong to that day.");
  }

  const [existing] = await db
    .select()
    .from(groupProofVotes)
    .where(
      and(
        eq(groupProofVotes.groupId, data.groupId),
        eq(groupProofVotes.date, data.date),
        eq(groupProofVotes.voterUserId, userId),
      ),
    )
    .limit(1);

  if (!existing) {
    await db.insert(groupProofVotes).values({
      groupId: data.groupId,
      date: data.date,
      checkinId: data.checkinId,
      voterUserId: userId,
    });
  } else if (existing.checkinId === data.checkinId) {
    await db.delete(groupProofVotes).where(eq(groupProofVotes.id, existing.id));
  } else {
    await db
      .update(groupProofVotes)
      .set({ checkinId: data.checkinId, createdAt: new Date() })
      .where(eq(groupProofVotes.id, existing.id));
  }

  const slug = await groupSlug(data.groupId);
  revalidatePath(`/groups/${slug}`);
}
