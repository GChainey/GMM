import {
  challengeDates,
  challengeEndIso,
  hasChallengeStarted,
  todayIsoInTz,
} from "./dates";
import type { ActivityKind } from "@/db/schema";

export type MemberStatus = "pending" | "ascending" | "fallen" | "ascended";

export interface ActivityLite {
  id: string;
  kind: ActivityKind;
  targetAmount: number | null;
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
  timezone: string | null | undefined;
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
}

export interface MonthlyProgress {
  activityId: string;
  total: number;
  target: number;
  ratio: number;
  reached: boolean;
}

export function computeStatus(input: ComputeStatusInput): ComputedStatus {
  const { activities, checkins, strikeLimit, timezone } = input;
  const todayIso = todayIsoInTz(timezone);
  const dates = challengeDates();
  const endIso = challengeEndIso();

  const dailyActivities = activities.filter(
    (a) => a.kind === "do" || a.kind === "abstain",
  );
  const monthlyActivities = activities.filter(
    (a) => a.kind === "monthly_total",
  );

  const completedLookup = new Map<string, boolean>();
  const amountByActivity = new Map<string, number>();
  for (const c of checkins) {
    completedLookup.set(`${c.activityId}::${c.date}`, c.completed);
    if (typeof c.amount === "number") {
      amountByActivity.set(
        c.activityId,
        (amountByActivity.get(c.activityId) ?? 0) + c.amount,
      );
    }
  }

  const totalSlots = dailyActivities.length * dates.length;
  let evaluatedSlots = 0;
  let strikes = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;

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
  }

  const monthlyProgress: MonthlyProgress[] = monthlyActivities.map((a) => {
    const total = amountByActivity.get(a.id) ?? 0;
    const target = a.targetAmount ?? 0;
    const ratio = target > 0 ? Math.min(1, total / target) : 0;
    return {
      activityId: a.id,
      total,
      target,
      ratio,
      reached: target > 0 && total >= target,
    };
  });

  if (!hasChallengeStarted(timezone)) {
    return {
      status: "pending",
      strikes: 0,
      totalSlots,
      evaluatedSlots: 0,
      currentStreak: 0,
      longestStreak: 0,
      todayIso,
      monthlyProgress,
    };
  }

  const monthlyFailed =
    todayIso > endIso &&
    monthlyActivities.length > 0 &&
    monthlyProgress.some((p) => !p.reached);

  if (strikes > strikeLimit || monthlyFailed) {
    return {
      status: "fallen",
      strikes,
      totalSlots,
      evaluatedSlots,
      currentStreak,
      longestStreak,
      todayIso,
      monthlyProgress,
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
    };
  }

  return {
    status: "ascending",
    strikes,
    totalSlots,
    evaluatedSlots,
    currentStreak,
    longestStreak,
    todayIso,
    monthlyProgress,
  };
}

export interface CellState {
  date: string;
  state: "future" | "pending" | "done" | "missed";
}

export function buildCells(
  activities: ActivityLite[],
  checkins: CheckinLite[],
  timezone: string | null | undefined,
): Map<string, CellState> {
  const todayIso = todayIsoInTz(timezone);
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
