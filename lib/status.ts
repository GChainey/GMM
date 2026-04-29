import {
  challengeDates,
  challengeEndIso,
  hasChallengeStarted,
  todayIsoInTz,
} from "./dates";

export type MemberStatus = "pending" | "ascending" | "fallen" | "ascended";

export interface CheckinLite {
  activityId: string;
  date: string;
  completed: boolean;
}

export interface ComputeStatusInput {
  activityIds: string[];
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
}

export function computeStatus(input: ComputeStatusInput): ComputedStatus {
  const { activityIds, checkins, strikeLimit, timezone } = input;
  const todayIso = todayIsoInTz(timezone);
  const dates = challengeDates();
  const endIso = challengeEndIso();
  const lookup = new Map<string, boolean>();
  for (const c of checkins) {
    lookup.set(`${c.activityId}::${c.date}`, c.completed);
  }

  const totalSlots = activityIds.length * dates.length;
  let evaluatedSlots = 0;
  let strikes = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  for (const date of dates) {
    if (date > todayIso) break;
    let allDone = true;
    for (const aid of activityIds) {
      evaluatedSlots += 1;
      const done = lookup.get(`${aid}::${date}`) === true;
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

  if (!hasChallengeStarted(timezone)) {
    return {
      status: "pending",
      strikes: 0,
      totalSlots,
      evaluatedSlots: 0,
      currentStreak: 0,
      longestStreak: 0,
      todayIso,
    };
  }

  if (strikes > strikeLimit) {
    return {
      status: "fallen",
      strikes,
      totalSlots,
      evaluatedSlots,
      currentStreak,
      longestStreak,
      todayIso,
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
  };
}

export interface CellState {
  date: string;
  state: "future" | "pending" | "done" | "missed";
}

export function buildCells(
  activityIds: string[],
  checkins: CheckinLite[],
  timezone: string | null | undefined,
): Map<string, CellState> {
  const todayIso = todayIsoInTz(timezone);
  const cells = new Map<string, CellState>();
  const lookup = new Map<string, boolean>();
  for (const c of checkins) lookup.set(`${c.activityId}::${c.date}`, c.completed);

  for (const date of challengeDates()) {
    let state: CellState["state"] = "done";
    if (date > todayIso) {
      state = "future";
    } else {
      let allDone = true;
      let anyMissing = false;
      for (const aid of activityIds) {
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
