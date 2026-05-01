"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  activities,
  groupMemberships,
  groups,
  pledgeEdits,
  pledgeOptions,
  pledges,
  type PledgeSnapshot,
} from "@/db/schema";
import { ensureUserRow, requireUserId } from "@/lib/auth";

const activitySchema = z
  .object({
    id: z.string().optional(),
    label: z.string().min(1).max(120),
    description: z.string().max(500).default(""),
    kind: z
      .enum(["do", "abstain", "weekly_tally", "monthly_total"])
      .default("do"),
    targetAmount: z.number().int().positive().nullable().default(null),
    unit: z.string().max(24).nullable().default(null),
    outcomeText: z.string().max(1000).default(""),
  })
  .refine(
    (a) => a.kind !== "monthly_total" || (a.targetAmount ?? 0) > 0,
    { message: "Monthly tallies need a positive target." },
  )
  .refine(
    (a) => a.kind !== "weekly_tally" || (a.targetAmount ?? 0) > 0,
    { message: "Weekly tallies need a positive target." },
  );

const pledgeSchema = z.object({
  slug: z.string(),
  pledgeText: z.string().max(4000).default(""),
  rewardOptionId: z.string().nullable().default(null),
  punishmentOptionId: z.string().nullable().default(null),
  rewardText: z.string().max(1000).default(""),
  punishmentText: z.string().max(1000).default(""),
  charityName: z.string().max(120).default(""),
  charityUrl: z.string().max(500).default(""),
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

  const rawRewardOption = formData.get("rewardOptionId");
  const rawPunishmentOption = formData.get("punishmentOptionId");

  const data = pledgeSchema.parse({
    slug: String(formData.get("slug") ?? ""),
    pledgeText: String(formData.get("pledgeText") ?? ""),
    rewardOptionId:
      rawRewardOption && String(rawRewardOption) !== ""
        ? String(rawRewardOption)
        : null,
    punishmentOptionId:
      rawPunishmentOption && String(rawPunishmentOption) !== ""
        ? String(rawPunishmentOption)
        : null,
    rewardText: String(formData.get("rewardText") ?? ""),
    punishmentText: String(formData.get("punishmentText") ?? ""),
    charityName: String(formData.get("charityName") ?? ""),
    charityUrl: String(formData.get("charityUrl") ?? ""),
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

  const validateOption = async (
    optionId: string,
    type: "reward" | "punishment",
    allowed: string[],
  ) => {
    if (!allowed.includes(optionId)) {
      throw new Error("That option is not permitted in this pantheon.");
    }
    const [opt] = await db
      .select({ id: pledgeOptions.id })
      .from(pledgeOptions)
      .where(
        and(
          eq(pledgeOptions.id, optionId),
          eq(pledgeOptions.type, type),
          inArray(
            pledgeOptions.id,
            allowed.length > 0 ? allowed : ["__never__"],
          ),
        ),
      )
      .limit(1);
    if (!opt) {
      throw new Error("That option is no longer available.");
    }
  };

  if (data.rewardOptionId) {
    await validateOption(
      data.rewardOptionId,
      "reward",
      group.allowedRewardOptionIds,
    );
  } else if (!group.allowCustomReward) {
    throw new Error("Pick a reward from the pantheon's list.");
  }

  if (data.punishmentOptionId) {
    await validateOption(
      data.punishmentOptionId,
      "punishment",
      group.allowedPunishmentOptionIds,
    );
  } else if (!group.allowCustomPunishment) {
    throw new Error("Pick a punishment from the pantheon's list.");
  }

  let charityName = "";
  let charityUrl = "";
  if (group.charityModeEnabled && group.charitySelection === "individual") {
    charityName = data.charityName.trim();
    charityUrl = data.charityUrl.trim();
    if (charityName.length === 0) {
      throw new Error(
        "Name thy cause — in this pantheon, each mortal's fall feeds the winner's chosen charity.",
      );
    }
    if (charityUrl.length > 0 && !/^https?:\/\//i.test(charityUrl)) {
      throw new Error("The charity link must begin with http:// or https://.");
    }
  }

  let [pledge] = await db
    .select()
    .from(pledges)
    .where(and(eq(pledges.userId, userId), eq(pledges.groupId, group.id)))
    .limit(1);

  let beforeSnapshot: PledgeSnapshot | null = null;
  if (pledge) {
    const existingActs = await db
      .select()
      .from(activities)
      .where(eq(activities.pledgeId, pledge.id))
      .orderBy(asc(activities.sortOrder));
    beforeSnapshot = {
      pledge: {
        pledgeText: pledge.pledgeText,
        rewardText: pledge.rewardText,
        punishmentText: pledge.punishmentText,
        rewardOptionId: pledge.rewardOptionId,
        punishmentOptionId: pledge.punishmentOptionId,
        charityName: pledge.charityName,
        charityUrl: pledge.charityUrl,
      },
      activities: existingActs.map((a) => ({
        id: a.id,
        label: a.label,
        description: a.description,
        sortOrder: a.sortOrder,
        kind: a.kind,
        targetAmount: a.targetAmount,
        unit: a.unit,
        outcomeText: a.outcomeText,
      })),
    };
  }

  if (!pledge) {
    [pledge] = await db
      .insert(pledges)
      .values({
        userId,
        groupId: group.id,
        pledgeText: data.pledgeText,
        rewardText: data.rewardText,
        punishmentText: data.punishmentText,
        rewardOptionId: data.rewardOptionId,
        punishmentOptionId: data.punishmentOptionId,
        charityName,
        charityUrl,
      })
      .returning();
  } else {
    await db
      .update(pledges)
      .set({
        pledgeText: data.pledgeText,
        rewardText: data.rewardText,
        punishmentText: data.punishmentText,
        rewardOptionId: data.rewardOptionId,
        punishmentOptionId: data.punishmentOptionId,
        charityName,
        charityUrl,
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
          kind: act.kind,
          targetAmount: act.targetAmount,
          unit: act.unit,
          outcomeText: act.outcomeText,
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
          kind: act.kind,
          targetAmount: act.targetAmount,
          unit: act.unit,
          outcomeText: act.outcomeText,
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

  const afterSnapshot: PledgeSnapshot = {
    pledge: {
      pledgeText: data.pledgeText,
      rewardText: data.rewardText,
      punishmentText: data.punishmentText,
      rewardOptionId: data.rewardOptionId,
      punishmentOptionId: data.punishmentOptionId,
      charityName,
      charityUrl,
    },
    activities: data.activities.map((act, idx) => ({
      id: keepIds[idx],
      label: act.label,
      description: act.description,
      sortOrder: idx,
      kind: act.kind,
      targetAmount: act.targetAmount,
      unit: act.unit,
      outcomeText: act.outcomeText,
    })),
  };

  await db.insert(pledgeEdits).values({
    pledgeId: pledge.id,
    userId,
    groupId: group.id,
    before: beforeSnapshot,
    after: afterSnapshot,
  });

  revalidatePath(`/groups/${data.slug}`);
  revalidatePath(`/groups/${data.slug}/pledge/edit`);
  revalidatePath(`/dashboard`);
  revalidatePath(`/check-in`);
  redirect(`/groups/${data.slug}`);
}

const outcomeSchema = z.object({
  activityId: z.string(),
  shipped: z.boolean(),
});

export async function markOutcomeShippedAction(input: {
  activityId: string;
  shipped: boolean;
}) {
  const userId = await requireUserId();
  const data = outcomeSchema.parse(input);

  const [row] = await db
    .select({
      activity: activities,
      pledge: pledges,
      group: groups,
    })
    .from(activities)
    .innerJoin(pledges, eq(pledges.id, activities.pledgeId))
    .innerJoin(groups, eq(groups.id, pledges.groupId))
    .where(eq(activities.id, data.activityId))
    .limit(1);

  if (!row) throw new Error("Rite not found.");
  if (row.pledge.userId !== userId) {
    throw new Error("Thou canst only mark thine own outcome.");
  }
  if (!row.activity.outcomeText.trim()) {
    throw new Error("Inscribe this rite's month-end outcome first.");
  }

  await db
    .update(activities)
    .set({
      outcomeAchievedAt: data.shipped ? new Date() : null,
    })
    .where(eq(activities.id, row.activity.id));

  revalidatePath(`/groups/${row.group.slug}`);
  revalidatePath(`/dashboard`);
}
