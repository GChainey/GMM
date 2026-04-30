"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { activities, dailyCheckins, groups, pledges } from "@/db/schema";
import { ensureUserRow, requireUserId } from "@/lib/auth";
import {
  challengeDayNumber,
  challengeEndIso,
  hasChallengeStarted,
  resolveToday,
} from "@/lib/dates";
import {
  canSeekRedemption,
  computeStatus,
  type ActivityLite,
} from "@/lib/status";

const slugSchema = z.object({ slug: z.string().min(1) });

const TOTAL_CHALLENGE_DAYS = 31;

export async function acceptSecondVowAction(input: { slug: string }) {
  const userId = await requireUserId();
  await ensureUserRow();
  const { slug } = slugSchema.parse(input);

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);
  if (!group) throw new Error("This pantheon hath crumbled.");

  const [pledge] = await db
    .select()
    .from(pledges)
    .where(and(eq(pledges.groupId, group.id), eq(pledges.userId, userId)))
    .limit(1);
  if (!pledge) throw new Error("Thou hast no pledge to redeem.");
  if (pledge.redemptionAcceptedAt) {
    throw new Error("The second vow hath already been taken.");
  }

  const todayIso = await resolveToday("UTC");
  if (!hasChallengeStarted(todayIso)) {
    throw new Error("The ritual hath not yet begun.");
  }
  if (todayIso > challengeEndIso()) {
    throw new Error("The ritual is sealed.");
  }

  const acts = await db
    .select()
    .from(activities)
    .where(eq(activities.pledgeId, pledge.id));
  const checks = await db
    .select()
    .from(dailyCheckins)
    .where(eq(dailyCheckins.userId, userId));

  const actLite: ActivityLite[] = acts.map((a) => ({
    id: a.id,
    kind: (a.kind as "do" | "abstain" | "monthly_total") ?? "do",
    targetAmount: a.targetAmount,
    redeemedTargetAmount: a.redeemedTargetAmount,
  }));
  const myChecks = checks
    .filter((c) => acts.some((a) => a.id === c.activityId))
    .map((c) => ({
      activityId: c.activityId,
      date: typeof c.date === "string" ? c.date : String(c.date),
      completed: c.completed,
      amount: c.amount,
    }));

  const status = computeStatus({
    activities: actLite,
    checkins: myChecks,
    strikeLimit: group.strikeLimit,
    todayIso,
  });

  if (!canSeekRedemption(status)) {
    throw new Error(
      status.status !== "fallen"
        ? "Thou hast not fallen."
        : "The dusk hath passed — the second vow is closed to thee.",
    );
  }

  // Penance pace: 2× the originally planned daily pace, applied to the
  // remaining days (today through May 31). Outcome stays — only the daily
  // input doubles.
  const dayNum = challengeDayNumber(todayIso) ?? 1;
  const daysRemainingInclusive = TOTAL_CHALLENGE_DAYS - dayNum + 1;

  const newStrikeLimit = status.strikes;

  const tallyUpdates: { activityId: string; redeemedTarget: number }[] = [];
  for (const a of acts) {
    if (a.kind !== "monthly_total") continue;
    const original = a.targetAmount ?? 0;
    if (original <= 0) continue;
    const originalDailyPace = original / TOTAL_CHALLENGE_DAYS;
    const penancePace = originalDailyPace * 2;
    const progress = status.monthlyProgress.find(
      (p) => p.activityId === a.id,
    );
    const currentTotal = progress?.total ?? 0;
    const redeemedTarget = Math.ceil(
      currentTotal + penancePace * daysRemainingInclusive,
    );
    tallyUpdates.push({ activityId: a.id, redeemedTarget });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(pledges)
      .set({
        redemptionAcceptedAt: new Date(),
        redemptionStartedOn: todayIso,
        redeemedStrikeLimit: newStrikeLimit,
        updatedAt: new Date(),
      })
      .where(eq(pledges.id, pledge.id));

    for (const u of tallyUpdates) {
      await tx
        .update(activities)
        .set({ redeemedTargetAmount: u.redeemedTarget })
        .where(eq(activities.id, u.activityId));
    }
  });

  revalidatePath(`/groups/${slug}`);
  revalidatePath("/check-in");
  revalidatePath("/dashboard");
}
