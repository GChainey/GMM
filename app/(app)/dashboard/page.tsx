import Link from "next/link";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  dailyCheckins,
  groupMemberships,
  groups,
  pledges,
  users,
} from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { computeStatus } from "@/lib/status";
import {
  challengeStartIso,
  hasChallengeStarted,
  isChallengeOver,
  resolveGraceCutoff,
  resolveToday,
} from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusGlyph } from "@/components/status-glyph";
import { OutcomeBlock } from "@/components/outcome-block";

export default async function DashboardPage() {
  const userId = await requireUserId();

  const [me] = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const tz = me?.timezone ?? "UTC";

  const memberships = await db
    .select({
      groupId: groupMemberships.groupId,
      role: groupMemberships.role,
      group: groups,
    })
    .from(groupMemberships)
    .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
    .where(
      and(
        eq(groupMemberships.userId, userId),
        isNull(groups.archivedAt),
      ),
    );

  const groupIds = memberships.map((m) => m.groupId);

  const userPledges = groupIds.length
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
    : [];

  const userCheckins = userActivities.length
    ? await db
        .select()
        .from(dailyCheckins)
        .where(eq(dailyCheckins.userId, userId))
    : [];

  const todayIso = await resolveToday(tz);
  const graceCutoffIso = await resolveGraceCutoff(tz);
  const started = hasChallengeStarted(todayIso);
  const over = isChallengeOver(todayIso);

  const cards = memberships.map((m) => {
    const pledge = userPledges.find((p) => p.groupId === m.groupId);
    const acts = pledge
      ? userActivities.filter((a) => a.pledgeId === pledge.id)
      : [];
    const checks = userCheckins.filter((c) =>
      acts.some((a) => a.id === c.activityId),
    );
    const status = computeStatus({
      activities: acts.map((a) => ({
        id: a.id,
        kind:
          (a.kind as "do" | "abstain" | "weekly_tally" | "monthly_total") ??
          "do",
        targetAmount: a.targetAmount,
        redeemedTargetAmount: a.redeemedTargetAmount,
      })),
      checkins: checks.map((c) => ({
        activityId: c.activityId,
        date: typeof c.date === "string" ? c.date : String(c.date),
        completed: c.completed,
        amount: c.amount,
      })),
      strikeLimit: m.group.strikeLimit,
      todayIso,
      graceCutoffIso,
      redemptionStartedOn: pledge?.redemptionStartedOn ?? null,
      redeemedStrikeLimit: pledge?.redeemedStrikeLimit ?? null,
    });
    return { membership: m, pledge, activities: acts, status };
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10 md:px-10">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">
            THE ALTAR
          </p>
          <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
            {started
              ? over
                ? "The ritual is complete."
                : "The ritual is upon us."
              : "The ritual approaches."}
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            {started
              ? `Today is ${todayIso}. Mark thy daily rites in the Pantheon.`
              : `Pledges lock at midnight UTC on ${challengeStartIso()}. Inscribe thy vows now.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="gilded font-display tracking-widest">
            <Link href="/check-in">Daily Rite</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="font-display tracking-widest"
          >
            <Link href="/groups">Browse Pantheons</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="font-display tracking-widest"
          >
            <Link href="/groups/new">Found a Pantheon</Link>
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl tracking-tight">Thy Pantheons</h2>
        {cards.length === 0 ? (
          <Card className="marble-card">
            <CardContent className="flex flex-col items-start gap-4 p-8">
              <p className="font-display text-lg italic text-muted-foreground">
                Thou hast joined no pantheon yet.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild className="gilded font-display tracking-widest">
                  <Link href="/groups">Find one</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="font-display tracking-widest"
                >
                  <Link href="/groups/new">Found one</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cards.map(({ membership, pledge, activities: acts, status }) => (
              <Card key={membership.groupId} className="marble-card">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="font-display text-2xl tracking-tight">
                        <Link
                          href={`/groups/${membership.group.slug}`}
                          className="hover:underline"
                        >
                          {membership.group.name}
                        </Link>
                      </CardTitle>
                      <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                        {membership.group.isPublic ? "Open" : "Sealed"} ·{" "}
                        {membership.group.strikeLimit === 0
                          ? "No strikes"
                          : `${membership.group.strikeLimit} strikes allowed`}
                      </p>
                    </div>
                    <StatusGlyph
                      status={status.status}
                      reclaimed={status.reclaimed}
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {pledge ? (
                    <>
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {pledge.pledgeText || "—"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline" className="font-display">
                          {acts.length} rites
                        </Badge>
                        <Badge variant="outline" className="font-display">
                          {status.strikes} strikes
                        </Badge>
                        <Badge variant="outline" className="font-display">
                          🔥 {status.currentStreak}-day streak
                        </Badge>
                      </div>
                      {acts.length > 0 && (
                        <div className="flex flex-col gap-2">
                          {acts.map((a) => (
                            <OutcomeBlock
                              key={a.id}
                              slug={membership.group.slug}
                              activityId={a.id}
                              activityLabel={a.label}
                              outcomeText={a.outcomeText}
                              achievedAt={
                                a.outcomeAchievedAt
                                  ? a.outcomeAchievedAt.toISOString()
                                  : null
                              }
                              canEdit
                              variant="compact"
                            />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm italic text-muted-foreground">
                        Thou hast not yet inscribed thy pledge.
                      </p>
                      <Button asChild size="sm" className="gilded font-display">
                        <Link
                          href={`/groups/${membership.group.slug}/pledge/new`}
                        >
                          Inscribe
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
