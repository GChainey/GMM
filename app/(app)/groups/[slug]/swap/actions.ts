"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { goalSwaps, groupMemberships, groups } from "@/db/schema";
import { ensureUserRow, requireUserId } from "@/lib/auth";
import {
  hasChallengeStarted,
  isChallengeOver,
  resolveToday,
} from "@/lib/dates";

const proposeSchema = z.object({
  slug: z.string().min(1),
  targetUserId: z.string().min(1),
});

const swapIdSchema = z.object({
  swapId: z.string().min(1),
});

async function loadGroupAndMembership(slug: string, userId: string) {
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);
  if (!group) throw new Error("This pantheon hath crumbled.");

  const [membership] = await db
    .select()
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, group.id),
        eq(groupMemberships.userId, userId),
      ),
    )
    .limit(1);
  if (!membership) throw new Error("Thou must walk among this pantheon to invoke chaos.");

  return { group, membership };
}

export async function proposeSwitchAction(input: {
  slug: string;
  targetUserId: string;
}) {
  const userId = await requireUserId();
  await ensureUserRow();
  const data = proposeSchema.parse(input);

  if (data.targetUserId === userId) {
    throw new Error("Thou canst not switch with thyself.");
  }

  const { group } = await loadGroupAndMembership(data.slug, userId);

  const today = await resolveToday("UTC");
  if (!hasChallengeStarted(today)) {
    throw new Error("The Switching opens with the ritual on May 1st.");
  }
  if (isChallengeOver(today)) {
    throw new Error("The ritual is sealed. No more switching.");
  }

  // Target must also be a member of this pantheon.
  const [targetMembership] = await db
    .select()
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, group.id),
        eq(groupMemberships.userId, data.targetUserId),
      ),
    )
    .limit(1);
  if (!targetMembership) {
    throw new Error("That mortal walks not in this pantheon.");
  }

  // Either side may already be switched (accepted) for today — block it.
  // Either side may have a pending offer with the same partner — block dupes.
  const existing = await db
    .select()
    .from(goalSwaps)
    .where(
      and(
        eq(goalSwaps.groupId, group.id),
        eq(goalSwaps.swapDate, today),
        inArray(goalSwaps.status, ["pending", "accepted"]),
      ),
    );

  for (const s of existing) {
    if (s.status === "accepted") {
      const sides = [s.initiatorUserId, s.targetUserId];
      if (sides.includes(userId)) {
        throw new Error("Thou hast already switched with another today.");
      }
      if (sides.includes(data.targetUserId)) {
        throw new Error("That mortal hath already switched with another today.");
      }
    }
    if (s.status === "pending") {
      const samePair =
        (s.initiatorUserId === userId && s.targetUserId === data.targetUserId) ||
        (s.initiatorUserId === data.targetUserId && s.targetUserId === userId);
      if (samePair) {
        throw new Error("An offer already hangs between thee.");
      }
    }
  }

  await db.insert(goalSwaps).values({
    groupId: group.id,
    initiatorUserId: userId,
    targetUserId: data.targetUserId,
    swapDate: today,
    status: "pending",
  });

  revalidatePath(`/groups/${data.slug}`);
  revalidatePath("/check-in");
  revalidatePath("/dashboard");
}

async function loadOwnSwap(swapId: string, userId: string) {
  const [swap] = await db
    .select()
    .from(goalSwaps)
    .where(eq(goalSwaps.id, swapId))
    .limit(1);
  if (!swap) throw new Error("That offer hath vanished.");
  if (swap.initiatorUserId !== userId && swap.targetUserId !== userId) {
    throw new Error("This offer is not thine to touch.");
  }
  return swap;
}

export async function acceptSwitchAction(input: { swapId: string }) {
  const userId = await requireUserId();
  await ensureUserRow();
  const data = swapIdSchema.parse(input);

  const swap = await loadOwnSwap(data.swapId, userId);
  if (swap.targetUserId !== userId) {
    throw new Error("Only the receiver may accept.");
  }
  if (swap.status !== "pending") {
    throw new Error("This offer is no longer open.");
  }

  const today = await resolveToday("UTC");
  if (swap.swapDate !== today) {
    throw new Error("This offer hath gone stale — it was for another day.");
  }

  // Block accept if either side already has an accepted swap today.
  const blocking = await db
    .select()
    .from(goalSwaps)
    .where(
      and(
        eq(goalSwaps.groupId, swap.groupId),
        eq(goalSwaps.swapDate, today),
        eq(goalSwaps.status, "accepted"),
        or(
          eq(goalSwaps.initiatorUserId, swap.initiatorUserId),
          eq(goalSwaps.initiatorUserId, swap.targetUserId),
          eq(goalSwaps.targetUserId, swap.initiatorUserId),
          eq(goalSwaps.targetUserId, swap.targetUserId),
        ),
      ),
    );
  if (blocking.length > 0) {
    throw new Error("One of you hath already switched with another today.");
  }

  await db
    .update(goalSwaps)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(eq(goalSwaps.id, swap.id));

  // Auto-decline any other pending offers for either side today (stale offers).
  await db
    .update(goalSwaps)
    .set({ status: "declined", respondedAt: new Date() })
    .where(
      and(
        eq(goalSwaps.groupId, swap.groupId),
        eq(goalSwaps.swapDate, today),
        eq(goalSwaps.status, "pending"),
        or(
          eq(goalSwaps.initiatorUserId, swap.initiatorUserId),
          eq(goalSwaps.initiatorUserId, swap.targetUserId),
          eq(goalSwaps.targetUserId, swap.initiatorUserId),
          eq(goalSwaps.targetUserId, swap.targetUserId),
        ),
      ),
    );

  const [group] = await db
    .select({ slug: groups.slug })
    .from(groups)
    .where(eq(groups.id, swap.groupId))
    .limit(1);
  if (group) revalidatePath(`/groups/${group.slug}`);
  revalidatePath("/check-in");
  revalidatePath("/dashboard");
}

export async function declineSwitchAction(input: { swapId: string }) {
  const userId = await requireUserId();
  await ensureUserRow();
  const data = swapIdSchema.parse(input);

  const swap = await loadOwnSwap(data.swapId, userId);
  if (swap.targetUserId !== userId) {
    throw new Error("Only the receiver may decline.");
  }
  if (swap.status !== "pending") {
    throw new Error("This offer is no longer open.");
  }

  await db
    .update(goalSwaps)
    .set({ status: "declined", respondedAt: new Date() })
    .where(eq(goalSwaps.id, swap.id));

  const [group] = await db
    .select({ slug: groups.slug })
    .from(groups)
    .where(eq(groups.id, swap.groupId))
    .limit(1);
  if (group) revalidatePath(`/groups/${group.slug}`);
  revalidatePath("/check-in");
}

export async function cancelSwitchAction(input: { swapId: string }) {
  const userId = await requireUserId();
  await ensureUserRow();
  const data = swapIdSchema.parse(input);

  const swap = await loadOwnSwap(data.swapId, userId);
  if (swap.initiatorUserId !== userId) {
    throw new Error("Only the proposer may withdraw.");
  }
  if (swap.status !== "pending") {
    throw new Error("This offer is no longer open.");
  }

  await db
    .update(goalSwaps)
    .set({ status: "cancelled", respondedAt: new Date() })
    .where(eq(goalSwaps.id, swap.id));

  const [group] = await db
    .select({ slug: groups.slug })
    .from(groups)
    .where(eq(groups.id, swap.groupId))
    .limit(1);
  if (group) revalidatePath(`/groups/${group.slug}`);
  revalidatePath("/check-in");
}
