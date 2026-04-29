"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, notInArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { activities, groupMemberships, groups, pledges } from "@/db/schema";
import { ensureUserRow, requireUserId } from "@/lib/auth";
import { isLocked } from "@/lib/dates";

const activitySchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(120),
  description: z.string().max(500).default(""),
});

const pledgeSchema = z.object({
  slug: z.string(),
  pledgeText: z.string().max(4000).default(""),
  rewardText: z.string().max(1000).default(""),
  punishmentText: z.string().max(1000).default(""),
  activities: z.array(activitySchema).max(20),
});

export async function savePledgeAction(formData: FormData) {
  const userId = await requireUserId();
  await ensureUserRow();

  const rawActivities = String(formData.get("activitiesJson") ?? "[]");
  let parsedActivities: unknown;
  try {
    parsedActivities = JSON.parse(rawActivities);
  } catch {
    parsedActivities = [];
  }

  const data = pledgeSchema.parse({
    slug: String(formData.get("slug") ?? ""),
    pledgeText: String(formData.get("pledgeText") ?? ""),
    rewardText: String(formData.get("rewardText") ?? ""),
    punishmentText: String(formData.get("punishmentText") ?? ""),
    activities: parsedActivities,
  });

  if (data.activities.length === 0) {
    throw new Error("A pledge requires at least one daily rite.");
  }

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, data.slug))
    .limit(1);
  if (!group) throw new Error("Pantheon not found");

  const membership = await db
    .select()
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, group.id),
        eq(groupMemberships.userId, userId),
      ),
    )
    .limit(1);
  if (membership.length === 0) {
    throw new Error("Thou must take the vow before inscribing a pledge.");
  }

  if (isLocked()) {
    throw new Error(
      "The ritual has begun — pledges are sealed. They cannot be amended.",
    );
  }

  let [pledge] = await db
    .select()
    .from(pledges)
    .where(and(eq(pledges.userId, userId), eq(pledges.groupId, group.id)))
    .limit(1);

  if (!pledge) {
    [pledge] = await db
      .insert(pledges)
      .values({
        userId,
        groupId: group.id,
        pledgeText: data.pledgeText,
        rewardText: data.rewardText,
        punishmentText: data.punishmentText,
      })
      .returning();
  } else {
    await db
      .update(pledges)
      .set({
        pledgeText: data.pledgeText,
        rewardText: data.rewardText,
        punishmentText: data.punishmentText,
        updatedAt: new Date(),
      })
      .where(eq(pledges.id, pledge.id));
  }

  const keepIds: string[] = [];
  for (const [idx, act] of data.activities.entries()) {
    if (act.id) {
      await db
        .update(activities)
        .set({
          label: act.label,
          description: act.description,
          sortOrder: idx,
        })
        .where(eq(activities.id, act.id));
      keepIds.push(act.id);
    } else {
      const [created] = await db
        .insert(activities)
        .values({
          pledgeId: pledge.id,
          label: act.label,
          description: act.description,
          sortOrder: idx,
        })
        .returning({ id: activities.id });
      keepIds.push(created.id);
    }
  }

  if (keepIds.length === 0) {
    await db.delete(activities).where(eq(activities.pledgeId, pledge.id));
  } else {
    await db
      .delete(activities)
      .where(
        and(
          eq(activities.pledgeId, pledge.id),
          notInArray(activities.id, keepIds),
        ),
      );
  }

  revalidatePath(`/groups/${data.slug}`);
  revalidatePath(`/groups/${data.slug}/pledge/edit`);
  revalidatePath(`/dashboard`);
  revalidatePath(`/check-in`);
  redirect(`/groups/${data.slug}`);
}
