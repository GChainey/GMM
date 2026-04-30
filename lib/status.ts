import {
  challengeDates,
  challengeDayNumber,
  challengeEndIso,
  challengeWeeks,
  hasChallengeStarted,
  weekForDate,
} from "./dates";
import type { ActivityKind } from "@/db/schema";

export type MemberStatus =
  | "pending"
  | "ascending"
  | "penitent"
  | "fallen"
  | "ascended";

export interface ActivityLite {
  id: string;
  kind: ActivityKind;
  targetAmount: number | null;
  redeemedTargetAmount?: number | null;
}

export interface CheckinLite {
  activityId: string;
  date: string;
  completed: boolean;
  amount?: number | null;
}

export interface ComputeStatusInput {
  activities: ActivityLite[];
  checkins: CheckinLite[];
  strikeLimit: number;
  todayIso: string;
  redemptionStartedOn?: string | null;
  redeemedStrikeLimit?: number | null;
}

export interface ComputedStatus {
  status: MemberStatus;
  strikes: number;
  totalSlots: number;
  evaluatedSlots: number;
  currentStreak: number;
  longestStreak: number;
  todayIso: string;
  monthlyProgress: MonthlyProgress[];
  weeklyProgress: WeeklyProgress[];
  fallenOn: string | null;
  reclaimed: boolean;
  effectiveStrikeLimit: number;
  isRedeemed: boolean;
}

export interface MonthlyProgress {
  activityId: string;
  total: number;
  target: number;
  ratio: number;
  reached: boolean;
}

export interface WeeklyProgress {
  activityId: string;
  weekIndex: number;
  weekLabel: number;
  weekStartIso: string;
  weekEndIso: string;
  total: number;
  target: number;
  ratio: number;
  reached: boolean;
  isCurrent: boolean;
  isPast: boolean;
}

export const REDEMPTION_WINDOW_DAYS = 3;
const TALLY_FALL_TRIGGER_MIN_DAY = 7;
const TALLY_FALL_TRIGGER_THRESHOLD = 0.5;

function effectiveTargetFor(a: ActivityLite): number {
  if (a.kind !== "monthly_total") return 0;
  return a.redeemedTargetAmount ?? a.targetAmount ?? 0;
}

function weeklyBaseTargetFor(a: ActivityLite): number {
  if (a.kind !== "weekly_tally") return 0;
  return a.redeemedTargetAmount ?? a.targetAmount ?? 0;
}

// Pro-rate the weekly target for partial weeks at the month edge so a 3-day
// final week is not held to a full 7-day quota.
function weeklyTargetForWeek(a: ActivityLite, days: number): number {
  const base = weeklyBaseTargetFor(a);
  if (base <= 0) return 0;
  if (days >= 7) return base;
  return Math.max(1, Math.ceil((base * days) / 7));
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function redemptionDeadline(fallenOn: string): string {
  return addDaysIso(fallenOn, REDEMPTION_WINDOW_DAYS);
}

export function canSeekRedemption(status: ComputedStatus): boolean {
  if (status.isRedeemed) return false;
  if (status.status !== "fallen") return false;
  if (!status.fallenOn) return false;
  if (status.todayIso > challengeEndIso()) return false;
  return status.todayIso <= redemptionDeadline(status.fallenOn);
}

export function computeStatus(input: ComputeStatusInput): ComputedStatus {
  const {
    activities,
    checkins,
    strikeLimit,
    todayIso,
    redemptionStartedOn,
    redeemedStrikeLimit,
  } = input;
  const dates = challengeDates();
  const endIso = challengeEndIso();
  const totalChallengeDays = dates.length;

  const dailyActivities = activities.filter(
    (a) => a.kind === "do" || a.kind === "abstain",
  );
  const monthlyActivities = activities.filter(
    (a) => a.kind === "monthly_total",
  );
  const weeklyActivities = activities.filter(
    (a) => a.kind === "weekly_tally",
  );
  const weeks = challengeWeeks();

  const isRedeemed = Boolean(redemptionStartedOn);
  const effectiveStrikeLimit = redeemedStrikeLimit ?? strikeLimit;

  const completedLookup = new Map<string, boolean>();
  for (const c of checkins) {
    completedLookup.set(`${c.activityId}::${c.date}`, c.completed);
  }

  const tallyKey = (activityId: string) => activityId;

  const dailyAmountByActivity = new Map<string, Map<string, number>>();
  for (const a of monthlyActivities) {
    dailyAmountByActivity.set(tallyKey(a.id), new Map());
  }
  for (const a of weeklyActivities) {
    dailyAmountByActivity.set(tallyKey(a.id), new Map());
  }
  for (const c of checkins) {
    const m = dailyAmountByActivity.get(c.activityId);
    if (!m) continue;
    // Weekly tallies count each completed=true day as 1 if no explicit amount;
    // monthly tallies require an explicit amount.
    const inc =
      typeof c.amount === "number"
        ? c.amount
        : c.completed
          ? weeklyActivities.some((wa) => wa.id === c.activityId)
            ? 1
            : 0
          : 0;
    if (inc === 0 && (typeof c.amount !== "number")) continue;
    m.set(c.date, (m.get(c.date) ?? 0) + inc);
  }
  const runningTotals = new Map<string, number>();
  for (const a of monthlyActivities) runningTotals.set(a.id, 0);

  // Per-week running totals for weekly tallies, keyed `${activityId}::${weekIndex}`.
  const weeklyTotals = new Map<string, number>();
  const weeklyKey = (activityId: string, weekIndex: number) =>
    `${activityId}::${weekIndex}`;
  for (const a of weeklyActivities) {
    for (const w of weeks) weeklyTotals.set(weeklyKey(a.id, w.index), 0);
  }

  const totalSlots = dailyActivities.length * dates.length;
  let evaluatedSlots = 0;
  let strikes = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;
  let fallenOn: string | null = null;

  for (const date of dates) {
    if (date > todayIso) break;

    let allDone = true;
    for (const a of dailyActivities) {
      evaluatedSlots += 1;
      const done = completedLookup.get(`${a.id}::${date}`) === true;
      if (!done) {
        strikes += 1;
        allDone = false;
      }
    }
    if (allDone) {
      runningStreak += 1;
      if (runningStreak > longestStreak) longestStreak = runningStreak;
    } else {
      runningStreak = 0;
    }
    if (date === todayIso) currentStreak = runningStreak;

    for (const a of monthlyActivities) {
      const dayAmount = dailyAmountByActivity.get(a.id)?.get(date) ?? 0;
      runningTotals.set(a.id, (runningTotals.get(a.id) ?? 0) + dayAmount);
    }
    const week = weekForDate(date);
    if (week) {
      for (const a of weeklyActivities) {
        const dayAmount = dailyAmountByActivity.get(a.id)?.get(date) ?? 0;
        const k = weeklyKey(a.id, week.index);
        weeklyTotals.set(k, (weeklyTotals.get(k) ?? 0) + dayAmount);
      }
    }

    if (fallenOn === null) {
      if (strikes > effectiveStrikeLimit) {
        fallenOn = date;
        continue;
      }
      // Mid-month tally trigger fires only pre-redemption; once penitent,
      // the check is deferred to end-of-month against the redeemed target.
      if (!isRedeemed) {
        const dayNum = challengeDayNumber(date) ?? 0;
        if (dayNum >= TALLY_FALL_TRIGGER_MIN_DAY) {
          for (const a of monthlyActivities) {
            const target = effectiveTargetFor(a);
            if (target <= 0) continue;
            const expectedByNow = (dayNum / totalChallengeDays) * target;
            const totalSoFar = runningTotals.get(a.id) ?? 0;
            if (totalSoFar < TALLY_FALL_TRIGGER_THRESHOLD * expectedByNow) {
              fallenOn = date;
              break;
            }
          }
        }
      }
      // End-of-week trigger for weekly tallies: when a week closes (today is
      // its final day) and the user fell short of the week's target, the path
      // is broken. We only check when we're actually past or on the week's
      // final day so the week is fully decided.
      if (fallenOn === null && week && date === week.endIso) {
        for (const a of weeklyActivities) {
          const target = weeklyTargetForWeek(a, week.days);
          if (target <= 0) continue;
          const totalSoFar = weeklyTotals.get(weeklyKey(a.id, week.index)) ?? 0;
          if (totalSoFar < target) {
            fallenOn = date;
            break;
          }
        }
      }
    }
  }

  const monthlyProgress: MonthlyProgress[] = monthlyActivities.map((a) => {
    const total = runningTotals.get(a.id) ?? 0;
    const target = effectiveTargetFor(a);
    const ratio = target > 0 ? Math.min(1, total / target) : 0;
    return {
      activityId: a.id,
      total,
      target,
      ratio,
      reached: target > 0 && total >= target,
    };
  });

  const weeklyProgress: WeeklyProgress[] = [];
  for (const a of weeklyActivities) {
    for (const w of weeks) {
      const total = weeklyTotals.get(weeklyKey(a.id, w.index)) ?? 0;
      const target = weeklyTargetForWeek(a, w.days);
      const ratio = target > 0 ? Math.min(1, total / target) : 0;
      const isCurrent = todayIso >= w.startIso && todayIso <= w.endIso;
      const isPast = todayIso > w.endIso;
      weeklyProgress.push({
        activityId: a.id,
        weekIndex: w.index,
        weekLabel: w.label,
        weekStartIso: w.startIso,
        weekEndIso: w.endIso,
        total,
        target,
        ratio,
        reached: target > 0 && total >= target,
        isCurrent,
        isPast,
      });
    }
  }

  if (!hasChallengeStarted(todayIso)) {
    return {
      status: "pending",
      strikes: 0,
      totalSlots,
      evaluatedSlots: 0,
      currentStreak: 0,
      longestStreak: 0,
      todayIso,
      monthlyProgress,
      weeklyProgress,
      fallenOn: null,
      reclaimed: false,
      effectiveStrikeLimit,
      isRedeemed,
    };
  }

  const monthlyFailedAtEnd =
    todayIso > endIso &&
    monthlyActivities.length > 0 &&
    monthlyProgress.some((p) => !p.reached);
  const weeklyFailedAtEnd =
    todayIso > endIso &&
    weeklyActivities.length > 0 &&
    weeklyProgress.some((p) => p.target > 0 && !p.reached);

  if (fallenOn !== null || monthlyFailedAtEnd || weeklyFailedAtEnd) {
    return {
      status: "fallen",
      strikes,
      totalSlots,
      evaluatedSlots,
      currentStreak,
      longestStreak,
      todayIso,
      monthlyProgress,
      weeklyProgress,
      fallenOn: fallenOn ?? endIso,
      reclaimed: false,
      effectiveStrikeLimit,
      isRedeemed,
    };
  }

  if (todayIso > endIso) {
    return {
      status: "ascended",
      strikes,
      totalSlots,
      evaluatedSlots,
      currentStreak,
      longestStreak,
      todayIso,
      monthlyProgress,
      weeklyProgress,
      fallenOn: null,
      reclaimed: isRedeemed,
      effectiveStrikeLimit,
      isRedeemed,
    };
  }

  return {
    status: isRedeemed ? "penitent" : "ascending",
    strikes,
    totalSlots,
    evaluatedSlots,
    currentStreak,
    longestStreak,
    todayIso,
    monthlyProgress,
    weeklyProgress,
    fallenOn: null,
    reclaimed: false,
    effectiveStrikeLimit,
    isRedeemed,
  };
}

export interface CellState {
  date: string;
  state: "future" | "pending" | "done" | "missed";
}

export function buildCells(
  activities: ActivityLite[],
  checkins: CheckinLite[],
  todayIso: string,
): Map<string, CellState> {
  const cells = new Map<string, CellState>();
  const dailyIds = activities
    .filter((a) => a.kind === "do" || a.kind === "abstain")
    .map((a) => a.id);
  const lookup = new Map<string, boolean>();
  for (const c of checkins) lookup.set(`${c.activityId}::${c.date}`, c.completed);

  for (const date of challengeDates()) {
    let state: CellState["state"] = "done";
    if (date > todayIso) {
      state = "future";
    } else if (dailyIds.length === 0) {
      state = "done";
    } else {
      let allDone = true;
      let anyMissing = false;
      for (const aid of dailyIds) {
        const done = lookup.get(`${aid}::${date}`) === true;
        if (!done) {
          allDone = false;
          anyMissing = true;
        }
      }
      if (date === todayIso && anyMissing) {
        state = "pending";
      } else if (!allDone) {
        state = "missed";
      } else {
        state = "done";
      }
    }
    cells.set(date, { date, state });
  }
  return cells;
}
