import { eq, like } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  dailyCheckins,
  groupMemberships,
  groups,
  pledges,
  users,
} from "@/db/schema";
import { challengeStartIso } from "./dates";
import {
  DEMO_DEFAULT_TODAY,
  DEMO_GROUP_NAME,
  DEMO_GROUP_SLUG,
  DEMO_MEMBERS,
  DEMO_USER_PREFIX,
} from "./demo";
import { createInviteToken } from "./id";
import { DEFAULT_PRESET, PRESETS, seedSlugsToIds } from "./pledge-options";

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function pseudoRandom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export async function wipeDemoPantheon() {
  const [existing] = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, DEMO_GROUP_SLUG))
    .limit(1);
  if (existing) {
    // Cascading FKs handle memberships, pledges, activities, checkins.
    await db.delete(groups).where(eq(groups.id, existing.id));
  }
  await db.delete(users).where(like(users.id, `${DEMO_USER_PREFIX}%`));
}

export async function demoPantheonExists(): Promise<boolean> {
  const [row] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.slug, DEMO_GROUP_SLUG))
    .limit(1);
  return Boolean(row);
}

// Founds the Demo Council from scratch — wipes any prior demo data first.
// Caller is responsible for revalidation/cookie setting.
export async function seedDemoPantheonCore(founderId: string): Promise<void> {
  await wipeDemoPantheon();

  for (const m of DEMO_MEMBERS) {
    await db.insert(users).values({
      id: m.id,
      displayName: m.displayName,
      avatarUrl: null,
      timezone: "UTC",
      faceStyle: m.faceStyle,
      faceColor: m.faceColor,
      faceGaze: m.faceGaze,
      faceDepth: m.faceDepth,
    });
  }

  const preset = PRESETS[DEFAULT_PRESET];
  const [group] = await db
    .insert(groups)
    .values({
      slug: DEMO_GROUP_SLUG,
      name: DEMO_GROUP_NAME,
      description:
        "A demo pantheon for play. Press ⌘K to travel through time and toggle outcomes.",
      isPublic: true,
      strikeLimit: 5,
      inviteToken: createInviteToken(),
      ownerId: founderId,
      allowedRewardOptionIds: seedSlugsToIds(preset.rewardSlugs),
      allowedPunishmentOptionIds: seedSlugsToIds(preset.punishmentSlugs),
      allowCustomReward: preset.allowCustomReward,
      allowCustomPunishment: preset.allowCustomPunishment,
    })
    .returning();

  await db.insert(groupMemberships).values({
    groupId: group.id,
    userId: founderId,
    role: "owner",
  });
  for (const m of DEMO_MEMBERS) {
    await db.insert(groupMemberships).values({
      groupId: group.id,
      userId: m.id,
      role: "member",
    });
  }

  const seedThrough = DEMO_DEFAULT_TODAY;

  for (const m of DEMO_MEMBERS) {
    const [pledge] = await db
      .insert(pledges)
      .values({
        userId: m.id,
        groupId: group.id,
        pledgeText: m.pledgeText,
        rewardText: m.rewardText,
        punishmentText: m.punishmentText,
      })
      .returning();

    const insertedActivities: {
      id: string;
      kind: string;
      dailyAmount: number | null;
      targetAmount: number | null;
    }[] = [];
    for (const [idx, a] of m.activities.entries()) {
      const [created] = await db
        .insert(activities)
        .values({
          pledgeId: pledge.id,
          label: a.label,
          description: a.description,
          sortOrder: idx,
          kind: a.kind,
          targetAmount: a.targetAmount,
          unit: a.unit,
          // Bind the deliverable to the first rite — same shape as the 0005
          // migration's backfill.
          outcomeText: idx === 0 ? m.outcomeText : "",
        })
        .returning({ id: activities.id });
      insertedActivities.push({
        id: created.id,
        kind: a.kind,
        dailyAmount: a.dailyAmount ?? null,
        targetAmount: a.targetAmount,
      });
    }

    let cursor = challengeStartIso();
    while (cursor <= seedThrough) {
      for (const a of insertedActivities) {
        const r = pseudoRandom(`${m.id}::${a.id}::${cursor}`);
        if (r >= m.completionRate) continue;
        const amount =
          a.kind === "monthly_total"
            ? a.dailyAmount ??
              Math.max(1, Math.round((a.targetAmount ?? 0) / 31))
            : null;
        await db.insert(dailyCheckins).values({
          userId: m.id,
          activityId: a.id,
          date: cursor,
          completed: true,
          amount,
        });
      }
      cursor = addDays(cursor, 1);
    }
  }
}
