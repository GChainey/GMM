import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  dailyCheckins,
  groupMemberships,
  groups,
  journalEntries,
  pledgeOptions,
  pledges,
  users,
  type Activity,
  type DailyCheckin,
  type Group,
  type Pledge,
  type User,
} from "@/db/schema";
import { isChallengeDate } from "@/lib/dates";
import { buildCells, computeStatus, type ComputedStatus } from "@/lib/status";

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidShareDate(iso: string): boolean {
  return ISO_DATE_RE.test(iso) && isChallengeDate(iso);
}

export interface PersonalDailyShareData {
  user: User;
  group: Group;
  pledge: Pledge;
  acts: Activity[];
  todayCheckins: DailyCheckin[];
  monthCheckins: DailyCheckin[];
  journalBody: string;
  photoUrl: string | null;
  rewardOptionLabel: string | null;
  punishmentOptionLabel: string | null;
  status: ComputedStatus;
  cells: Map<string, { date: string; state: "future" | "pending" | "done" | "missed" }>;
  date: string;
  doneToday: number;
  totalToday: number;
  monthlyDone: { activityId: string; label: string; total: number; target: number; unit: string | null; ratio: number; reached: boolean }[];
}

export async function getPersonalDailyShareData(
  userId: string,
  dateIso: string,
): Promise<PersonalDailyShareData | null> {
  if (!isValidShareDate(dateIso)) return null;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const userPledges = await db
    .select()
    .from(pledges)
    .where(eq(pledges.userId, userId));
  if (userPledges.length === 0) return null;

  // Pick the user's first pledge (chronologically) — they typically have one
  // active pantheon during the May ritual. The share URL only carries userId
  // + date, so we pick deterministically.
  const pledge = userPledges.sort((a, b) => +a.createdAt - +b.createdAt)[0];

  const [group] = await db.select().from(groups).where(eq(groups.id, pledge.groupId)).limit(1);
  if (!group) return null;

  const acts = await db
    .select()
    .from(activities)
    .where(eq(activities.pledgeId, pledge.id))
    .orderBy(asc(activities.sortOrder));

  const activityIds = acts.map((a) => a.id);
  const todayCheckins = activityIds.length
    ? await db
        .select()
        .from(dailyCheckins)
        .where(
          and(
            eq(dailyCheckins.userId, userId),
            eq(dailyCheckins.date, dateIso),
          ),
        )
    : [];

  const monthCheckins = activityIds.length
    ? await db
        .select()
        .from(dailyCheckins)
        .where(
          and(
            eq(dailyCheckins.userId, userId),
            inArray(dailyCheckins.activityId, activityIds),
          ),
        )
    : [];

  const [journal] = await db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        eq(journalEntries.date, dateIso),
      ),
    )
    .limit(1);

  const photoUrl =
    todayCheckins.find((c) => c.photoUrl && c.completed)?.photoUrl ?? null;

  const optionIds = [pledge.rewardOptionId, pledge.punishmentOptionId].filter(
    (v): v is string => Boolean(v),
  );
  const optionRows = optionIds.length
    ? await db.select().from(pledgeOptions).where(inArray(pledgeOptions.id, optionIds))
    : [];
  const optionLabel = (id: string | null) =>
    id ? (optionRows.find((o) => o.id === id)?.label ?? null) : null;

  const dailyActs = acts.filter((a) => a.kind === "do" || a.kind === "abstain");
  const doneToday = dailyActs.filter((a) =>
    todayCheckins.some((c) => c.activityId === a.id && c.completed),
  ).length;

  const checkLite = monthCheckins.map((c) => ({
    activityId: c.activityId,
    date: typeof c.date === "string" ? c.date : String(c.date),
    completed: c.completed,
    amount: c.amount,
  }));
  const actLite = acts.map((a) => ({
    id: a.id,
    kind:
      (a.kind as "do" | "abstain" | "weekly_tally" | "monthly_total") ?? "do",
    targetAmount: a.targetAmount,
    redeemedTargetAmount: a.redeemedTargetAmount,
  }));
  const status = computeStatus({
    activities: actLite,
    checkins: checkLite,
    strikeLimit: group.strikeLimit,
    todayIso: dateIso,
    redemptionStartedOn: pledge.redemptionStartedOn ?? null,
    redeemedStrikeLimit: pledge.redeemedStrikeLimit ?? null,
  });
  const cells = buildCells(actLite, checkLite, dateIso);

  const monthlyDone = status.monthlyProgress
    .map((mp) => {
      const a = acts.find((x) => x.id === mp.activityId);
      if (!a) return null;
      return {
        activityId: mp.activityId,
        label: a.label,
        total: mp.total,
        target: mp.target,
        unit: a.unit,
        ratio: mp.ratio,
        reached: mp.reached,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  return {
    user,
    group,
    pledge,
    acts,
    todayCheckins,
    monthCheckins,
    journalBody: journal?.body ?? "",
    photoUrl,
    rewardOptionLabel: optionLabel(pledge.rewardOptionId),
    punishmentOptionLabel: optionLabel(pledge.punishmentOptionId),
    status,
    cells,
    date: dateIso,
    doneToday,
    totalToday: dailyActs.length,
    monthlyDone,
  };
}

export interface MemberRollup {
  user: User;
  pledge: Pledge | null;
  pledgeText: string;
  status: ComputedStatus;
  doneToday: boolean;
  hadAnyRiteToday: boolean;
  completedTodayAt: Date | null;
  outcomesShippedToday: { label: string; at: Date }[];
}

export interface GroupRoundupShareData {
  group: Group;
  date: string;
  members: MemberRollup[];
  // Highlights
  longestStreak: { user: User; streak: number } | null;
  firstToday: { user: User; at: Date } | null;
  shippedOutcomesToday: { user: User; label: string; at: Date }[];
  fallenToday: User[];
  ascendingCount: number;
  fallenCount: number;
  ascendedCount: number;
  penitentCount: number;
}

export async function getGroupRoundupShareData(
  slug: string,
  dateIso: string,
): Promise<GroupRoundupShareData | null> {
  if (!isValidShareDate(dateIso)) return null;

  const [group] = await db.select().from(groups).where(eq(groups.slug, slug)).limit(1);
  if (!group) return null;

  const memberRows = await db
    .select({ membership: groupMemberships, user: users })
    .from(groupMemberships)
    .innerJoin(users, eq(users.id, groupMemberships.userId))
    .where(eq(groupMemberships.groupId, group.id));

  if (memberRows.length === 0) {
    return {
      group,
      date: dateIso,
      members: [],
      longestStreak: null,
      firstToday: null,
      shippedOutcomesToday: [],
      fallenToday: [],
      ascendingCount: 0,
      fallenCount: 0,
      ascendedCount: 0,
      penitentCount: 0,
    };
  }

  const allPledges = await db
    .select()
    .from(pledges)
    .where(eq(pledges.groupId, group.id));

  const pledgeIds = allPledges.map((p) => p.id);
  const allActivities = pledgeIds.length
    ? await db.select().from(activities).where(inArray(activities.pledgeId, pledgeIds))
    : [];
  const activityIds = allActivities.map((a) => a.id);
  const allCheckins = activityIds.length
    ? await db
        .select()
        .from(dailyCheckins)
        .where(inArray(dailyCheckins.activityId, activityIds))
    : [];

  const members: MemberRollup[] = [];
  for (const { user } of memberRows) {
    const pledge = allPledges.find((p) => p.userId === user.id) ?? null;
    const acts = pledge ? allActivities.filter((a) => a.pledgeId === pledge.id) : [];
    const checks = allCheckins
      .filter((c) => acts.some((a) => a.id === c.activityId))
      .map((c) => ({
        activityId: c.activityId,
        date: typeof c.date === "string" ? c.date : String(c.date),
        completed: c.completed,
        amount: c.amount,
      }));
    const actLite = acts.map((a) => ({
      id: a.id,
      kind:
      (a.kind as "do" | "abstain" | "weekly_tally" | "monthly_total") ?? "do",
      targetAmount: a.targetAmount,
      redeemedTargetAmount: a.redeemedTargetAmount,
    }));
    const status = computeStatus({
      activities: actLite,
      checkins: checks,
      strikeLimit: group.strikeLimit,
      todayIso: dateIso,
      redemptionStartedOn: pledge?.redemptionStartedOn ?? null,
      redeemedStrikeLimit: pledge?.redeemedStrikeLimit ?? null,
    });

    const dailyActs = acts.filter(
      (a) => a.kind === "do" || a.kind === "abstain",
    );
    const todayCheckins = allCheckins.filter(
      (c) =>
        c.userId === user.id &&
        ((typeof c.date === "string" ? c.date : String(c.date)) === dateIso) &&
        acts.some((a) => a.id === c.activityId),
    );
    const completedToday = todayCheckins.filter((c) => c.completed);
    const doneToday =
      dailyActs.length > 0 &&
      dailyActs.every((a) =>
        completedToday.some((c) => c.activityId === a.id),
      );
    const completedTodayAt = doneToday
      ? new Date(
          Math.max(
            ...completedToday
              .filter((c) => dailyActs.some((a) => a.id === c.activityId))
              .map((c) => +c.updatedAt),
          ),
        )
      : null;

    const outcomesShippedToday = acts
      .filter((a) => {
        if (!a.outcomeAchievedAt) return false;
        const at = new Date(a.outcomeAchievedAt);
        return at.toISOString().slice(0, 10) === dateIso;
      })
      .map((a) => ({ label: a.label, at: new Date(a.outcomeAchievedAt as Date) }));

    members.push({
      user,
      pledge,
      pledgeText: pledge?.pledgeText ?? "",
      status,
      doneToday,
      hadAnyRiteToday: dailyActs.length > 0,
      completedTodayAt,
      outcomesShippedToday,
    });
  }

  // Sort: ascending first (highest streak), then penitent, then ascended,
  // then fallen — matches the visual emphasis.
  const statusOrder: Record<ComputedStatus["status"], number> = {
    ascending: 0,
    penitent: 1,
    ascended: 2,
    fallen: 3,
    pending: 4,
  };
  members.sort((a, b) => {
    const so = statusOrder[a.status.status] - statusOrder[b.status.status];
    if (so !== 0) return so;
    return b.status.currentStreak - a.status.currentStreak;
  });

  const longestStreakMember = [...members].sort(
    (a, b) => b.status.longestStreak - a.status.longestStreak,
  )[0];
  const longestStreak =
    longestStreakMember && longestStreakMember.status.longestStreak > 0
      ? { user: longestStreakMember.user, streak: longestStreakMember.status.longestStreak }
      : null;

  const completedToday = members.filter((m) => m.doneToday && m.completedTodayAt);
  completedToday.sort((a, b) => +(a.completedTodayAt as Date) - +(b.completedTodayAt as Date));
  const firstToday = completedToday[0]
    ? { user: completedToday[0].user, at: completedToday[0].completedTodayAt as Date }
    : null;

  const shippedOutcomesToday = members.flatMap((m) =>
    m.outcomesShippedToday.map((o) => ({ user: m.user, label: o.label, at: o.at })),
  );

  const fallenToday = members
    .filter(
      (m) =>
        m.status.status === "fallen" &&
        m.status.fallenOn === dateIso,
    )
    .map((m) => m.user);

  const counts = {
    ascendingCount: members.filter((m) => m.status.status === "ascending").length,
    fallenCount: members.filter((m) => m.status.status === "fallen").length,
    ascendedCount: members.filter((m) => m.status.status === "ascended").length,
    penitentCount: members.filter((m) => m.status.status === "penitent").length,
  };

  return {
    group,
    date: dateIso,
    members,
    longestStreak,
    firstToday,
    shippedOutcomesToday,
    fallenToday,
    ...counts,
  };
}

export function formatShareDate(iso: string): string {
  // "May 15, 2026"
  const [, mm, dd] = iso.split("-");
  const month = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ][Number(mm) - 1];
  return `${month} ${Number(dd)}, ${iso.slice(0, 4)}`;
}
