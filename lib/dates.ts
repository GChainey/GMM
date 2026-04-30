// Date helpers anchored on May 2026 in user's timezone.

import { cookies } from "next/headers";
import { DEMO_DEFAULT_TODAY, isDemoMode } from "./demo";

export const CHALLENGE_YEAR = 2026;
export const CHALLENGE_MONTH = 5; // May (1-indexed)

const TIMEZONE_FALLBACK = "UTC";

export const DEMO_DATE_COOKIE = "gmm_demo_date";

export function todayIsoInTz(timezone: string | null | undefined): string {
  const tz = timezone ?? TIMEZONE_FALLBACK;
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

export async function getDemoToday(): Promise<string | null> {
  if (!isDemoMode()) return null;
  const store = await cookies();
  const value = store.get(DEMO_DATE_COOKIE)?.value;
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

export async function resolveToday(
  timezone: string | null | undefined,
): Promise<string> {
  const demo = await getDemoToday();
  if (demo) return demo;
  const real = todayIsoInTz(timezone);
  // In demo mode, when wall-clock is outside the challenge window (i.e. now,
  // and forever after May 2026), park at a sensible midway date so seeded
  // data is visible immediately and the lock follows the demo clock.
  if (isDemoMode() && (real < challengeStartIso() || real > challengeEndIso())) {
    return DEMO_DEFAULT_TODAY;
  }
  return real;
}

export function challengeStartIso(): string {
  return `${CHALLENGE_YEAR}-05-01`;
}

export function challengeEndIso(): string {
  return `${CHALLENGE_YEAR}-05-31`;
}

export function challengeDates(): string[] {
  const dates: string[] = [];
  for (let day = 1; day <= 31; day++) {
    dates.push(`${CHALLENGE_YEAR}-05-${String(day).padStart(2, "0")}`);
  }
  return dates;
}

export interface ChallengeWeek {
  index: number; // 0-based (Wk 1 → 0)
  label: number; // 1-based (Wk 1 → 1)
  startIso: string;
  endIso: string;
  days: number; // 7 for full weeks, fewer for the partial last week
  isPartial: boolean;
}

// Calendar-aligned weeks within May: 1-7, 8-14, 15-21, 22-28, 29-31.
// Last week is partial (3 days); weekly targets pro-rate accordingly.
export function challengeWeeks(): ChallengeWeek[] {
  const weeks: ChallengeWeek[] = [];
  for (let i = 0; i < 5; i++) {
    const startDay = i * 7 + 1;
    const endDay = Math.min(startDay + 6, 31);
    const days = endDay - startDay + 1;
    weeks.push({
      index: i,
      label: i + 1,
      startIso: `${CHALLENGE_YEAR}-05-${String(startDay).padStart(2, "0")}`,
      endIso: `${CHALLENGE_YEAR}-05-${String(endDay).padStart(2, "0")}`,
      days,
      isPartial: days < 7,
    });
  }
  return weeks;
}

export function weekForDate(iso: string): ChallengeWeek | null {
  if (!isChallengeDate(iso)) return null;
  for (const w of challengeWeeks()) {
    if (iso >= w.startIso && iso <= w.endIso) return w;
  }
  return null;
}

export function isChallengeDate(iso: string): boolean {
  return iso >= challengeStartIso() && iso <= challengeEndIso();
}

export function challengeDayNumber(iso: string): number | null {
  if (!isChallengeDate(iso)) return null;
  return Number(iso.slice(8, 10));
}

export function isChallengeOver(today: string): boolean {
  return today > challengeEndIso();
}

export function hasChallengeStarted(today: string): boolean {
  return today >= challengeStartIso();
}

export function lockDateForGroup(): Date {
  // May 1 2026 at 00:00 UTC — pledges lock here.
  // (Per-user TZ would require a user-specific lock; UTC keeps the rule shared and predictable.)
  return new Date(Date.UTC(CHALLENGE_YEAR, 4, 1, 0, 0, 0));
}

export async function isLocked(): Promise<boolean> {
  // Demo mode: lock follows the demo clock so users can play with both states.
  const demo = await getDemoToday();
  if (demo) return demo >= challengeStartIso();
  return new Date() >= lockDateForGroup();
}
