"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { and, eq, inArray, like } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  activities,
  dailyCheckins,
  groupMemberships,
  groups,
  pledges,
  users,
} from "@/db/schema";
import { ensureUserRow, requireUserId } from "@/lib/auth";
import {
  challengeStartIso,
  challengeEndIso,
  DEMO_DATE_COOKIE,
  resolveToday,
  todayIsoInTz,
} from "@/lib/dates";
import {
  DEMO_GROUP_SLUG,
  DEMO_MEMBERS,
  DEMO_USER_PREFIX,
  isDemoMode,
} from "@/lib/demo";
import { seedDemoPantheonCore, wipeDemoPantheon } from "@/lib/demo-seed";

function assertDemoMode() {
  if (!isDemoMode()) {
    throw new Error("Demo mode is not enabled.");
  }
}

const isoSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function clampToChallenge(iso: string): string {
  if (iso < challengeStartIso()) return challengeStartIso();
  if (iso > challengeEndIso()) return challengeEndIso();
  return iso;
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Deterministic 0..1 hash for (userId, date) — gives reproducible seeded checkins.
function pseudoRandom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function revalidateDemo() {
  revalidatePath("/dashboard");
  revalidatePath("/check-in");
  revalidatePath("/groups");
  revalidatePath(`/groups/${DEMO_GROUP_SLUG}`);
}

// ---------- Time controls ----------

export async function setDemoTodayAction(input: { date: string }) {
  assertDemoMode();
  const date = clampToChallenge(isoSchema.parse(input.date));
  const store = await cookies();
  store.set(DEMO_DATE_COOKIE, date, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidateDemo();
  return { date };
}

export async function shiftDemoTodayAction(input: { delta: number }) {
  assertDemoMode();
  const current = await resolveToday("UTC");
  const next = clampToChallenge(addDays(current, Math.trunc(input.delta)));
  const store = await cookies();
  store.set(DEMO_DATE_COOKIE, next, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidateDemo();
  return { date: next };
}

export async function clearDemoTodayAction() {
  assertDemoMode();
  const store = await cookies();
  store.delete(DEMO_DATE_COOKIE);
  revalidateDemo();
}

// ---------- Per-member toggles ----------

const memberToggleSchema = z.object({
  userId: z.string().min(1),
});

async function getDemoMemberActivities(userId: string) {
  const rows = await db
    .select({ activity: activities, pledge: pledges })
    .from(activities)
    .innerJoin(pledges, eq(pledges.id, activities.pledgeId))
    .innerJoin(groups, eq(groups.id, pledges.groupId))
    .where(and(eq(pledges.userId, userId), eq(groups.slug, DEMO_GROUP_SLUG)));
  return rows;
}

export async function markMemberMissedAction(input: { userId: string }) {
  assertDemoMode();
  const { userId } = memberToggleSchema.parse(input);
  const today = await resolveToday("UTC");
  const acts = await getDemoMemberActivities(userId);
  if (acts.length === 0) return;
  const activityIds = acts.map((r) => r.activity.id);

  await db
    .delete(dailyCheckins)
    .where(
      and(
        eq(dailyCheckins.userId, userId),
        eq(dailyCheckins.date, today),
        inArray(dailyCheckins.activityId, activityIds),
      ),
    );

  revalidateDemo();
}

export async function markMemberCompletedAction(input: { userId: string }) {
  assertDemoMode();
  const { userId } = memberToggleSchema.parse(input);
  const today = await resolveToday("UTC");
  const memberSeed = DEMO_MEMBERS.find((m) => m.id === userId);
  const acts = await getDemoMemberActivities(userId);
  if (acts.length === 0) return;

  for (const { activity } of acts) {
    const existing = await db
      .select()
      .from(dailyCheckins)
      .where(
        and(
          eq(dailyCheckins.userId, userId),
          eq(dailyCheckins.activityId, activity.id),
          eq(dailyCheckins.date, today),
        ),
      )
      .limit(1);

    const seed = memberSeed?.activities.find((a) => a.label === activity.label);
    const amount =
      activity.kind === "monthly_total"
        ? seed?.dailyAmount ??
          Math.max(1, Math.round((activity.targetAmount ?? 0) / 31))
        : null;

    if (existing.length === 0) {
      await db.insert(dailyCheckins).values({
        userId,
        activityId: activity.id,
        date: today,
        completed: true,
        amount,
      });
    } else {
      await db
        .update(dailyCheckins)
        .set({
          completed: true,
          amount: amount ?? existing[0].amount,
          updatedAt: new Date(),
        })
        .where(eq(dailyCheckins.id, existing[0].id));
    }
  }

  revalidateDemo();
}

export async function runDemoTodayAction() {
  // Roll the dice for every demo member at the current demo today using each
  // member's completionRate. Preserves any manual overrides for the day.
  assertDemoMode();
  const today = await resolveToday("UTC");

  for (const member of DEMO_MEMBERS) {
    const acts = await getDemoMemberActivities(member.id);
    if (acts.length === 0) continue;

    for (const { activity } of acts) {
      const existing = await db
        .select()
        .from(dailyCheckins)
        .where(
          and(
            eq(dailyCheckins.userId, member.id),
            eq(dailyCheckins.activityId, activity.id),
            eq(dailyCheckins.date, today),
          ),
        )
        .limit(1);
      if (existing.length > 0) continue;

      const r = pseudoRandom(`${member.id}::${activity.id}::${today}`);
      const completed = r < member.completionRate;
      if (!completed) continue;

      const seed = member.activities.find((a) => a.label === activity.label);
      const amount =
        activity.kind === "monthly_total"
          ? seed?.dailyAmount ??
            Math.max(1, Math.round((activity.targetAmount ?? 0) / 31))
          : null;

      await db.insert(dailyCheckins).values({
        userId: member.id,
        activityId: activity.id,
        date: today,
        completed: true,
        amount,
      });
    }
  }

  revalidateDemo();
}

// ---------- Seed / reset ----------

export async function resetDemoPantheonAction() {
  assertDemoMode();
  await wipeDemoPantheon();
  revalidateDemo();
}

export async function seedDemoPantheonAction() {
  assertDemoMode();
  const founderId = await requireUserId();
  await ensureUserRow();
  await seedDemoPantheonCore(founderId);
  revalidateDemo();
  return { slug: DEMO_GROUP_SLUG };
}

// ---------- State for drawer ----------

export interface DemoStateMember {
  id: string;
  displayName: string;
  faceStyle: number | null;
  faceColor: number | null;
  faceGaze: number | null;
  faceDepth: number | null;
  todayDone: number;
  todayTotal: number;
}

export interface DemoState {
  enabled: boolean;
  demoToday: string | null;
  realToday: string;
  challengeStart: string;
  challengeEnd: string;
  pantheonExists: boolean;
  pantheonSlug: string;
  members: DemoStateMember[];
}

export async function getDemoStateAction(): Promise<DemoState> {
  const enabled = isDemoMode();
  const effectiveToday = await resolveToday("UTC");
  const realToday = todayIsoInTz("UTC");
  const store = await cookies();
  const demoToday = enabled
    ? store.get(DEMO_DATE_COOKIE)?.value ?? null
    : null;

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, DEMO_GROUP_SLUG))
    .limit(1);

  const members: DemoStateMember[] = [];
  if (group) {
    const rows = await db
      .select({
        user: users,
      })
      .from(groupMemberships)
      .innerJoin(users, eq(users.id, groupMemberships.userId))
      .where(
        and(
          eq(groupMemberships.groupId, group.id),
          like(users.id, `${DEMO_USER_PREFIX}%`),
        ),
      );

    for (const { user } of rows) {
      const acts = await getDemoMemberActivities(user.id);
      const total = acts.length;
      let done = 0;
      if (total > 0) {
        const todays = await db
          .select()
          .from(dailyCheckins)
          .where(
            and(
              eq(dailyCheckins.userId, user.id),
              eq(dailyCheckins.date, effectiveToday),
              inArray(
                dailyCheckins.activityId,
                acts.map((a) => a.activity.id),
              ),
            ),
          );
        done = todays.filter((c) => c.completed).length;
      }
      members.push({
        id: user.id,
        displayName: user.displayName,
        faceStyle: user.faceStyle,
        faceColor: user.faceColor,
        faceGaze: user.faceGaze,
        faceDepth: user.faceDepth,
        todayDone: done,
        todayTotal: total,
      });
    }
    members.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  return {
    enabled,
    demoToday,
    realToday,
    challengeStart: challengeStartIso(),
    challengeEnd: challengeEndIso(),
    pantheonExists: Boolean(group),
    pantheonSlug: DEMO_GROUP_SLUG,
    members,
  };
}
