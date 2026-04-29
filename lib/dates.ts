// Date helpers anchored on May 2026 in user's timezone.

export const CHALLENGE_YEAR = 2026;
export const CHALLENGE_MONTH = 5; // May (1-indexed)

const TIMEZONE_FALLBACK = "UTC";

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

export function isChallengeDate(iso: string): boolean {
  return iso >= challengeStartIso() && iso <= challengeEndIso();
}

export function challengeDayNumber(iso: string): number | null {
  if (!isChallengeDate(iso)) return null;
  return Number(iso.slice(8, 10));
}

export function isChallengeOver(timezone: string | null | undefined): boolean {
  return todayIsoInTz(timezone) > challengeEndIso();
}

export function hasChallengeStarted(
  timezone: string | null | undefined,
): boolean {
  return todayIsoInTz(timezone) >= challengeStartIso();
}

export function lockDateForGroup(): Date {
  // May 1 2026 at 00:00 UTC — pledges lock here.
  // (Per-user TZ would require a user-specific lock; UTC keeps the rule shared and predictable.)
  return new Date(Date.UTC(CHALLENGE_YEAR, 4, 1, 0, 0, 0));
}

export function isLocked(now: Date = new Date()): boolean {
  return now >= lockDateForGroup();
}
