import Link from "next/link";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  dailyCheckins,
  goalSwaps,
  groupMemberships,
  groups,
  journalEntries,
  pledges,
  users,
} from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import {
  challengeStartIso,
  hasChallengeStarted,
  isChallengeOver,
  resolveToday,
  weekForDate,
} from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PledgeRiteList, type RiteRowProps } from "@/components/pledge-rite-list";
import { DayCompleteBanner } from "@/components/day-complete-banner";
import { JournalEntry } from "@/components/journal-entry";
import { Share2, Shuffle } from "lucide-react";

export default async function CheckInPage() {
  const userId = await requireUserId();
  const today = await resolveToday("UTC");
  const started = hasChallengeStarted(today);
  const over = isChallengeOver(today);

  const myMemberships = await db
    .select({
      group: groups,
      membership: groupMemberships,
    })
    .from(groupMemberships)
    .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
    .where(
      and(
        eq(groupMemberships.userId, userId),
        isNull(groups.archivedAt),
      ),
    );

  const groupIdToName = new Map(
    myMemberships.map((m) => [m.group.id, m.group.name]),
  );
  const groupIdToSlug = new Map(
    myMemberships.map((m) => [m.group.id, m.group.slug]),
  );
  const myGroupIds = myMemberships.map((m) => m.group.id);

  const userPledges = myGroupIds.length
    ? await db
        .select()
        .from(pledges)
        .where(
          and(
            eq(pledges.userId, userId),
            inArray(pledges.groupId, myGroupIds),
          ),
        )
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

  const currentWeek = weekForDate(today);
  const weeklyActivityIds = userActivities
    .filter((a) => a.kind === "weekly_tally")
    .map((a) => a.id);
  const weeklyCheckins =
    weeklyActivityIds.length && currentWeek
      ? await db
          .select()
          .from(dailyCheckins)
          .where(
            and(
              eq(dailyCheckins.userId, userId),
              inArray(dailyCheckins.activityId, weeklyActivityIds),
            ),
          )
      : [];

  const weekDoneByActivity = new Map<string, number>();
  if (currentWeek) {
    for (const c of weeklyCheckins) {
      const cDate = typeof c.date === "string" ? c.date : String(c.date);
      if (cDate < currentWeek.startIso || cDate > currentWeek.endIso) continue;
      if (!c.completed) continue;
      weekDoneByActivity.set(
        c.activityId,
        (weekDoneByActivity.get(c.activityId) ?? 0) + 1,
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

  const allRitesDone =
    started &&
    !over &&
    userActivities.length > 0 &&
    userActivities.every(
      (a) => checkinByActivity.get(a.id)?.completed === true,
    );

  const pantheonsForBanner = Array.from(
    new Map(
      userPledges.map((p) => [
        p.groupId,
        {
          slug: groupIdToSlug.get(p.groupId) ?? "",
          name: groupIdToName.get(p.groupId) ?? "—",
        },
      ]),
    ).values(),
  ).filter((p) => p.slug.length > 0);

  // The Switching: surface today's accepted swap partner per pantheon.
  const activeSwaps = myGroupIds.length
    ? await db
        .select()
        .from(goalSwaps)
        .where(
          and(
            eq(goalSwaps.swapDate, today),
            eq(goalSwaps.status, "accepted"),
            inArray(goalSwaps.groupId, myGroupIds),
            or(
              eq(goalSwaps.initiatorUserId, userId),
              eq(goalSwaps.targetUserId, userId),
            ),
          ),
        )
    : [];

  type PartnerView = {
    pledgeText: string;
    partnerName: string;
    rites: { id: string; label: string; description: string; kind: string; targetAmount: number | null; unit: string | null }[];
  };
  const partnerByGroupId = new Map<string, PartnerView>();
  if (activeSwaps.length > 0) {
    const partnerIds = activeSwaps.map((s) =>
      s.initiatorUserId === userId ? s.targetUserId : s.initiatorUserId,
    );
    const partnerRows = await db
      .select()
      .from(users)
      .where(inArray(users.id, partnerIds));
    const partnerNameById = new Map(
      partnerRows.map((u) => [u.id, u.displayName]),
    );
    const partnerPledges = await db
      .select()
      .from(pledges)
      .where(
        and(
          inArray(pledges.userId, partnerIds),
          inArray(pledges.groupId, myGroupIds),
        ),
      );
    const partnerPledgeIds = partnerPledges.map((p) => p.id);
    const partnerActs = partnerPledgeIds.length
      ? await db
          .select()
          .from(activities)
          .where(inArray(activities.pledgeId, partnerPledgeIds))
          .orderBy(asc(activities.sortOrder))
      : [];
    for (const swap of activeSwaps) {
      const partnerId =
        swap.initiatorUserId === userId
          ? swap.targetUserId
          : swap.initiatorUserId;
      const pledge = partnerPledges.find(
        (p) => p.userId === partnerId && p.groupId === swap.groupId,
      );
      if (!pledge) continue;
      const rites = partnerActs.filter((a) => a.pledgeId === pledge.id);
      partnerByGroupId.set(swap.groupId, {
        pledgeText: pledge.pledgeText,
        partnerName: partnerNameById.get(partnerId) ?? "another mortal",
        rites: rites.map((a) => ({
          id: a.id,
          label: a.label,
          description: a.description,
          kind: a.kind,
          targetAmount: a.targetAmount,
          unit: a.unit,
        })),
      });
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
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
        </div>
        {started && groupedByPledge.length > 0 && !allRitesDone && (
          <Button
            asChild
            variant="outline"
            className="font-display tracking-widest"
          >
            <Link href={`/share/daily/${userId}/${today}`}>
              <Share2 className="h-4 w-4" />
              Share today
            </Link>
          </Button>
        )}
      </header>

      {allRitesDone && (
        <DayCompleteBanner
          userId={userId}
          date={today}
          riteCount={userActivities.length}
          pantheons={pantheonsForBanner}
        />
      )}

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
        groupedByPledge.map(({ pledge, groupName, acts }) => {
          const partner = partnerByGroupId.get(pledge.groupId);
          return (
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
              {partner && (
                <div className="flex flex-col gap-2 rounded-md border border-divine/50 bg-divine/10 p-4">
                  <p className="flex items-center gap-1 font-display text-[0.65rem] uppercase tracking-[0.3em] text-divine">
                    <Shuffle className="h-3 w-3" />
                    The Switching · today thou art {partner.partnerName}
                  </p>
                  <p className="text-sm italic">
                    {partner.pledgeText || "(no pledge inscribed)"}
                  </p>
                  {partner.rites.length > 0 && (
                    <ul className="flex flex-col gap-1 text-sm">
                      {partner.rites.map((r) => (
                        <li key={r.id} className="flex items-baseline gap-2">
                          <span className="text-divine">·</span>
                          <span>
                            {r.kind === "abstain" && "✗ "}
                            {r.kind === "monthly_total" && "Σ "}
                            {r.kind === "weekly_tally" && "≋ "}
                            <span className="font-display tracking-wide">
                              {r.label}
                            </span>
                            {r.kind === "monthly_total" && r.targetAmount && (
                              <span className="text-muted-foreground">
                                {" "}
                                — target {r.targetAmount}
                                {r.unit ? ` ${r.unit}` : ""}
                              </span>
                            )}
                            {r.kind === "weekly_tally" && r.targetAmount && (
                              <span className="text-muted-foreground">
                                {" "}
                                — {r.targetAmount}
                                {r.unit ? ` ${r.unit}` : ""}/week
                              </span>
                            )}
                            {r.description && (
                              <span className="text-muted-foreground">
                                {" "}
                                — {r.description}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs italic text-muted-foreground">
                    Walk these rites today. Strikes & streaks remain on thine
                    own ledger below — mark them as thou hast lived the
                    Switching.
                  </p>
                </div>
              )}
              {acts.length === 0 ? (
                <p className="italic text-muted-foreground">
                  No rites inscribed.
                </p>
              ) : !started ? (
                <p className="italic text-muted-foreground">
                  Rites unlock May 1st.
                </p>
              ) : (
                <PledgeRiteList
                  date={today}
                  rites={acts.map((a): RiteRowProps => {
                    const c = checkinByActivity.get(a.id);
                    const kind =
                      (a.kind as
                        | "do"
                        | "abstain"
                        | "weekly_tally"
                        | "monthly_total") ?? "do";
                    return {
                      activityId: a.id,
                      kind,
                      label: a.label,
                      description: a.description,
                      groupName,
                      date: today,
                      initialCompleted: c?.completed ?? false,
                      initialAmount: c?.amount ?? null,
                      initialPhotoUrl: c?.photoUrl ?? null,
                      unit: a.unit,
                      target: a.redeemedTargetAmount ?? a.targetAmount,
                      monthTotalSoFar: monthTotalByActivity.get(a.id) ?? 0,
                      weekDoneSoFar: weekDoneByActivity.get(a.id) ?? 0,
                      weekTarget: a.redeemedTargetAmount ?? a.targetAmount,
                      weekStartIso: currentWeek?.startIso,
                      weekEndIso: currentWeek?.endIso,
                    };
                  })}
                />
              )}
            </CardContent>
          </Card>
          );
        })
      )}

      {started && !over && groupedByPledge.length > 0 && (
        <JournalEntry date={today} initialBody={todayJournal?.body ?? ""} />
      )}
    </div>
  );
}
