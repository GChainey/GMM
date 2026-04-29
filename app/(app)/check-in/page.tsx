import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  dailyCheckins,
  groupMemberships,
  groups,
  journalEntries,
  pledges,
} from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import {
  challengeStartIso,
  hasChallengeStarted,
  isChallengeOver,
  todayIsoInTz,
} from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckinRow } from "@/components/checkin-row";
import { JournalEntry } from "@/components/journal-entry";

export default async function CheckInPage() {
  const userId = await requireUserId();
  const today = todayIsoInTz("UTC");
  const started = hasChallengeStarted("UTC");
  const over = isChallengeOver("UTC");

  const myMemberships = await db
    .select({
      group: groups,
      membership: groupMemberships,
    })
    .from(groupMemberships)
    .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
    .where(eq(groupMemberships.userId, userId));

  const groupIdToName = new Map(
    myMemberships.map((m) => [m.group.id, m.group.name]),
  );

  const userPledges = myMemberships.length
    ? await db
        .select()
        .from(pledges)
        .where(eq(pledges.userId, userId))
    : [];

  const pledgeIds = userPledges.map((p) => p.id);
  const userActivities = pledgeIds.length
    ? await db
        .select()
        .from(activities)
        .where(inArray(activities.pledgeId, pledgeIds))
        .orderBy(asc(activities.sortOrder))
    : [];

  const activityIds = userActivities.map((a) => a.id);

  const todaysCheckins = activityIds.length
    ? await db
        .select()
        .from(dailyCheckins)
        .where(
          and(
            eq(dailyCheckins.userId, userId),
            eq(dailyCheckins.date, today),
          ),
        )
    : [];

  const checkinByActivity = new Map(
    todaysCheckins.map((c) => [c.activityId, c]),
  );

  const monthlyActivityIds = userActivities
    .filter((a) => a.kind === "monthly_total")
    .map((a) => a.id);

  const monthlyCheckins = monthlyActivityIds.length
    ? await db
        .select()
        .from(dailyCheckins)
        .where(
          and(
            eq(dailyCheckins.userId, userId),
            inArray(dailyCheckins.activityId, monthlyActivityIds),
          ),
        )
    : [];

  const monthTotalByActivity = new Map<string, number>();
  for (const c of monthlyCheckins) {
    if (typeof c.amount === "number") {
      monthTotalByActivity.set(
        c.activityId,
        (monthTotalByActivity.get(c.activityId) ?? 0) + c.amount,
      );
    }
  }

  const [todayJournal] = await db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        eq(journalEntries.date, today),
      ),
    )
    .limit(1);

  const groupedByPledge = userPledges.map((p) => ({
    pledge: p,
    groupName: groupIdToName.get(p.groupId) ?? "—",
    acts: userActivities.filter((a) => a.pledgeId === p.id),
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 md:px-10">
      <header>
        <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">
          DAILY RITE
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          {!started
            ? "The ritual has not yet begun"
            : over
              ? "The ritual is complete"
              : `Today — ${today}`}
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          {!started
            ? `Daily rites unlock at midnight UTC on ${challengeStartIso()}.`
            : over
              ? "Thy fate is sealed. Visit thy pantheons to see who ascended."
              : "Mark each rite as it is performed. Photo proof is welcomed."}
        </p>
      </header>

      {groupedByPledge.length === 0 || userActivities.length === 0 ? (
        <Card className="marble-card">
          <CardContent className="flex flex-col items-start gap-3 p-8">
            <p className="font-display italic text-muted-foreground">
              Thou hast inscribed no pledge yet.
            </p>
            <Button asChild className="gilded font-display tracking-widest">
              <Link href="/groups">Find a pantheon</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        groupedByPledge.map(({ pledge, groupName, acts }) => (
          <Card key={pledge.id} className="marble-card">
            <CardHeader>
              <CardTitle className="font-display text-2xl tracking-tight">
                {groupName}
              </CardTitle>
              <p className="text-sm italic text-muted-foreground">
                {pledge.pledgeText || "—"}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {acts.length === 0 ? (
                <p className="italic text-muted-foreground">
                  No rites inscribed.
                </p>
              ) : !started ? (
                <p className="italic text-muted-foreground">
                  Rites unlock May 1st.
                </p>
              ) : (
                acts.map((a) => {
                  const c = checkinByActivity.get(a.id);
                  const kind =
                    (a.kind as "do" | "abstain" | "monthly_total") ?? "do";
                  return (
                    <CheckinRow
                      key={a.id}
                      activityId={a.id}
                      kind={kind}
                      label={a.label}
                      description={a.description}
                      groupName={groupName}
                      date={today}
                      initialCompleted={c?.completed ?? false}
                      initialAmount={c?.amount ?? null}
                      initialPhotoUrl={c?.photoUrl ?? null}
                      unit={a.unit}
                      target={a.targetAmount}
                      monthTotalSoFar={monthTotalByActivity.get(a.id) ?? 0}
                    />
                  );
                })
              )}
            </CardContent>
          </Card>
        ))
      )}

      {started && !over && groupedByPledge.length > 0 && (
        <JournalEntry date={today} initialBody={todayJournal?.body ?? ""} />
      )}
    </div>
  );
}
