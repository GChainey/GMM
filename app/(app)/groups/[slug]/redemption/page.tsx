import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  dailyCheckins,
  groups,
  pledges,
} from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import {
  challengeDayNumber,
  challengeEndIso,
  resolveToday,
} from "@/lib/dates";
import {
  REDEMPTION_WINDOW_DAYS,
  addDaysIso,
  canSeekRedemption,
  computeStatus,
  redemptionDeadline,
  type ActivityLite,
} from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { acceptSecondVowAction } from "./actions";

const TOTAL_CHALLENGE_DAYS = 31;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function RedemptionPage({ params }: PageProps) {
  const { slug } = await params;
  const userId = await requireUserId();

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);
  if (!group) notFound();

  const [pledge] = await db
    .select()
    .from(pledges)
    .where(and(eq(pledges.groupId, group.id), eq(pledges.userId, userId)))
    .limit(1);
  if (!pledge) {
    redirect(`/groups/${slug}`);
  }

  if (pledge.redemptionAcceptedAt) {
    redirect(`/groups/${slug}`);
  }

  const acts = await db
    .select()
    .from(activities)
    .where(eq(activities.pledgeId, pledge.id));
  const checks = await db
    .select()
    .from(dailyCheckins)
    .where(eq(dailyCheckins.userId, userId));

  const todayIso = await resolveToday("UTC");
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

  const eligible = canSeekRedemption(status);

  const dayNum = challengeDayNumber(todayIso) ?? 1;
  const daysRemaining = TOTAL_CHALLENGE_DAYS - dayNum + 1;

  const tallyPenance = acts
    .filter((a) => a.kind === "monthly_total")
    .map((a) => {
      const original = a.targetAmount ?? 0;
      const originalDailyPace = original / TOTAL_CHALLENGE_DAYS;
      const penancePace = originalDailyPace * 2;
      const progress = status.monthlyProgress.find(
        (p) => p.activityId === a.id,
      );
      const currentTotal = progress?.total ?? 0;
      const newTarget = Math.ceil(currentTotal + penancePace * daysRemaining);
      return {
        id: a.id,
        label: a.label,
        unit: a.unit ?? "",
        original,
        currentTotal,
        originalDailyPace,
        penancePace,
        newTarget,
        outcomeText: a.outcomeText,
      };
    });

  const dailyRites = acts.filter(
    (a) => a.kind === "do" || a.kind === "abstain",
  );

  const fallenOn = status.fallenOn;
  const deadline = fallenOn ? redemptionDeadline(fallenOn) : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-3">
        <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">
          THE SECOND VOW
        </p>
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          A path of redemption
        </h1>
        <p className="text-muted-foreground">
          Thou hast fallen from <span className="font-display">{group.name}</span>.
          The temple offers a single dusk — {REDEMPTION_WINDOW_DAYS} days from thy
          fall — to take a stricter vow and reclaim thy ascent. The outcome thou
          pledged stands; only thy daily inputs redouble for the days that
          remain.
        </p>
      </header>

      {!eligible ? (
        <Card className="marble-card">
          <CardContent className="flex flex-col gap-3 p-6">
            <p className="font-display text-xl tracking-tight">
              The window hath closed.
            </p>
            <p className="text-sm text-muted-foreground">
              {status.status !== "fallen"
                ? "Thou hast not fallen, mortal. Continue thy ascent."
                : fallenOn
                  ? `Thou didst fall on ${fallenOn}. The dusk for the second vow ended on ${addDaysIso(fallenOn, REDEMPTION_WINDOW_DAYS)}.`
                  : "The ritual is sealed — no second vow may be taken now."}
            </p>
            <div>
              <Button asChild variant="outline" className="font-display tracking-widest">
                <Link href={`/groups/${slug}`}>Return to the pantheon</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="marble-card border-penitent/40">
          <CardContent className="flex flex-col gap-5 p-6">
            <div className="flex flex-col gap-1">
              <p className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-penitent">
                The terms of penance
              </p>
              <p className="font-display text-2xl tracking-tight">
                Acceptance is final.
              </p>
              <p className="text-sm text-muted-foreground">
                Once sealed, the second vow cannot be undone. The Switching is
                closed to the penitent.
              </p>
            </div>

            {dailyRites.length > 0 && (
              <section className="flex flex-col gap-2">
                <p className="font-display text-sm tracking-tight">
                  Daily rites — zero further strikes
                </p>
                <p className="text-sm text-muted-foreground">
                  Thou hast{" "}
                  <span className="font-display text-foreground">{status.strikes}</span>{" "}
                  strike{status.strikes === 1 ? "" : "s"} on thy ledger. From
                  the moment thou takest the second vow, every remaining day
                  must be perfect — a single missed rite ends the path.
                </p>
                <ul className="ml-5 list-disc text-sm">
                  {dailyRites.map((a) => (
                    <li key={a.id}>
                      {a.kind === "abstain" ? "Abstain — " : ""}
                      {a.label}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {tallyPenance.length > 0 && (
              <section className="flex flex-col gap-2">
                <p className="font-display text-sm tracking-tight">
                  Tallies — daily input redoubled
                </p>
                <p className="text-sm text-muted-foreground">
                  For the {daysRemaining} day{daysRemaining === 1 ? "" : "s"}{" "}
                  remaining, thy daily contribution doubles. The end goal is
                  unchanged — only the price of getting there.
                </p>
                <div className="flex flex-col gap-2">
                  {tallyPenance.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-md border border-penitent/30 bg-penitent/5 p-3 text-sm"
                    >
                      <p className="font-display tracking-tight">{t.label}</p>
                      <p className="mt-1 text-muted-foreground">
                        Logged so far:{" "}
                        <span className="text-foreground">
                          {t.currentTotal}
                          {t.unit ? ` ${t.unit}` : ""}
                        </span>
                        {" · "}
                        Original pace:{" "}
                        <span className="text-foreground">
                          {t.originalDailyPace.toFixed(1)}
                          {t.unit ? ` ${t.unit}` : ""}
                        </span>
                        /day
                      </p>
                      <p className="mt-1">
                        Penance pace:{" "}
                        <span className="font-display text-penitent">
                          {t.penancePace.toFixed(1)}
                          {t.unit ? ` ${t.unit}` : ""}
                        </span>
                        /day for the remaining {daysRemaining} day
                        {daysRemaining === 1 ? "" : "s"} —{" "}
                        new target{" "}
                        <span className="font-display text-foreground">
                          {t.newTarget}
                          {t.unit ? ` ${t.unit}` : ""}
                        </span>
                        .
                      </p>
                      {t.outcomeText && (
                        <p className="mt-1 text-xs italic text-muted-foreground">
                          Outcome stands: {t.outcomeText}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {deadline && (
              <p className="text-xs italic text-muted-foreground">
                Thou didst fall on {fallenOn}. The dusk closes on {deadline}.
                Today is {todayIso}.
              </p>
            )}

            <form
              action={async () => {
                "use server";
                await acceptSecondVowAction({ slug });
                redirect(`/groups/${slug}`);
              }}
              className="flex flex-wrap items-center gap-2"
            >
              <Button
                type="submit"
                className="gilded font-display tracking-widest"
              >
                I take the second vow
              </Button>
              <Button
                asChild
                variant="outline"
                className="font-display tracking-widest"
              >
                <Link href={`/groups/${slug}`}>Not yet</Link>
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Today is {todayIso}. The ritual ends on {challengeEndIso()}.
      </p>
    </div>
  );
}
