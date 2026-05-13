import Link from "next/link";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
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
import {
  challengeDates,
  hasChallengeStarted,
  isChallengeDate,
  resolveGraceCutoff,
  resolveToday,
} from "@/lib/dates";
import {
  activityCreatedOnIso,
  buildCells,
  type ActivityLite,
  type CellState,
} from "@/lib/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PledgeRiteList,
  type RiteRowProps,
} from "@/components/pledge-rite-list";
import { cn } from "@/lib/utils";
import { ArrowLeft, CalendarClock } from "lucide-react";

interface HistoryPageProps {
  searchParams: Promise<{ date?: string }>;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function cellTone(state: CellState["state"] | undefined, isSelected: boolean) {
  const base = "transition";
  if (isSelected) {
    return cn(base, "ring-2 ring-gold ring-offset-1 ring-offset-background");
  }
  switch (state) {
    case "done":
      return cn(base, "bg-gold/80 text-gold-foreground hover:bg-gold");
    case "missed":
      return cn(
        base,
        "bg-fallen/80 text-primary-foreground hover:bg-fallen",
      );
    case "pending":
      return cn(base, "bg-divine/30 text-foreground hover:bg-divine/50");
    case "unmarked":
      return cn(
        base,
        "border-dashed bg-muted/40 text-muted-foreground hover:bg-muted/70",
      );
    case "future":
    default:
      return cn(base, "bg-muted/30 text-muted-foreground/50");
  }
}

function stateLabel(state: CellState["state"] | undefined): string {
  switch (state) {
    case "done":
      return "All rites inscribed";
    case "missed":
      return "A rite was forsworn";
    case "pending":
      return "Still in grace";
    case "unmarked":
      return "Unmarked — catch up?";
    case "future":
      return "Yet to come";
    default:
      return "—";
  }
}

export default async function CheckInHistoryPage({
  searchParams,
}: HistoryPageProps) {
  const userId = await requireUserId();
  const { date: rawDate } = await searchParams;

  const [me] = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const tz = me?.timezone ?? "UTC";

  const today = await resolveToday(tz);
  const graceCutoff = await resolveGraceCutoff(tz);
  const started = hasChallengeStarted(today);

  const selectedDate =
    rawDate && isChallengeDate(rawDate) && rawDate <= today ? rawDate : null;

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

  const allCheckins = activityIds.length
    ? await db
        .select()
        .from(dailyCheckins)
        .where(eq(dailyCheckins.userId, userId))
    : [];

  const actLite: ActivityLite[] = userActivities.map((a) => ({
    id: a.id,
    kind:
      (a.kind as "do" | "abstain" | "weekly_tally" | "monthly_total") ?? "do",
    targetAmount: a.targetAmount,
    redeemedTargetAmount: a.redeemedTargetAmount,
    createdOnIso: activityCreatedOnIso(a.createdAt),
  }));
  const checkLite = allCheckins.map((c) => ({
    activityId: c.activityId,
    date: typeof c.date === "string" ? c.date : String(c.date),
    completed: c.completed,
    amount: c.amount,
  }));
  const cells = buildCells(actLite, checkLite, today, graceCutoff);
  const dates = challengeDates();

  const firstWeekday = new Date(`${dates[0]}T00:00:00Z`).getUTCDay();
  const leadingBlanks = Array.from({ length: firstWeekday });

  const selectedCheckinByActivity = new Map(
    selectedDate
      ? allCheckins
          .filter(
            (c) =>
              (typeof c.date === "string" ? c.date : String(c.date)) ===
              selectedDate,
          )
          .map((c) => [c.activityId, c])
      : [],
  );

  const groupedByPledge = userPledges.map((p) => ({
    pledge: p,
    groupName: groupIdToName.get(p.groupId) ?? "—",
    acts: userActivities.filter((a) => a.pledgeId === p.id),
  }));

  const selectedState = selectedDate ? cells.get(selectedDate)?.state : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">
            CODEX OF DAYS
          </p>
          <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
            Look back, inscribe what was lived
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            A forgotten day no longer takes a strike — only a willing &ldquo;did
            not do&rdquo; does. Tap any past day to catch up on its rites.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="font-display tracking-widest"
        >
          <Link href="/check-in">
            <ArrowLeft className="h-4 w-4" />
            Back to today
          </Link>
        </Button>
      </header>

      {!started ? (
        <Card className="marble-card">
          <CardContent className="p-8">
            <p className="italic text-muted-foreground">
              The ritual has not yet begun. The codex unlocks on May 1st.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="marble-card">
            <CardHeader>
              <CardTitle className="font-display text-xl tracking-tight">
                May 2026
              </CardTitle>
              <Legend />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 text-center">
                {WEEKDAY_LABELS.map((w, i) => (
                  <div
                    key={`${w}-${i}`}
                    className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground"
                  >
                    {w}
                  </div>
                ))}
                {leadingBlanks.map((_, i) => (
                  <div key={`blank-${i}`} aria-hidden />
                ))}
                {dates.map((d) => {
                  const cell = cells.get(d);
                  const day = Number(d.slice(8));
                  const isSelected = d === selectedDate;
                  const isFuture = cell?.state === "future";
                  const tone = cellTone(cell?.state, isSelected);
                  const title = `${d} — ${stateLabel(cell?.state)}`;
                  if (isFuture) {
                    return (
                      <div
                        key={d}
                        title={title}
                        className={cn(
                          "flex aspect-square items-center justify-center rounded-md border border-border/40 text-sm font-medium",
                          tone,
                        )}
                      >
                        {day}
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={d}
                      href={`/check-in/history?date=${d}`}
                      title={title}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-md border border-border/40 text-sm font-medium",
                        tone,
                      )}
                    >
                      {day}
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedDate && (
            <Card className="marble-card">
              <CardHeader>
                <p className="font-display text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
                  <CalendarClock className="mr-2 inline h-3 w-3" />
                  {stateLabel(selectedState ?? "unmarked")}
                </p>
                <CardTitle className="font-display text-2xl tracking-tight">
                  {selectedDate}
                </CardTitle>
                <p className="text-sm italic text-muted-foreground">
                  Inscribe each rite as it was lived. A blank entry takes no
                  strike — only an honest &ldquo;did not do&rdquo; does.
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {groupedByPledge.length === 0 ? (
                  <p className="italic text-muted-foreground">
                    Thou hast inscribed no pledge.
                  </p>
                ) : (
                  groupedByPledge.map(({ pledge, groupName, acts }) => {
                    const dailyActs = acts.filter(
                      (a) => a.kind === "do" || a.kind === "abstain",
                    );
                    if (dailyActs.length === 0) return null;
                    return (
                      <div key={pledge.id} className="flex flex-col gap-2">
                        <p className="font-display text-sm tracking-tight">
                          {groupName}
                        </p>
                        <PledgeRiteList
                          date={selectedDate}
                          rites={dailyActs.map((a): RiteRowProps => {
                            const c = selectedCheckinByActivity.get(a.id);
                            const kind =
                              (a.kind as
                                | "do"
                                | "abstain"
                                | "weekly_tally"
                                | "monthly_total") ?? "do";
                            return {
                              activityId: a.id,
                              userId,
                              kind,
                              label: a.label,
                              description: a.description,
                              groupName,
                              date: selectedDate,
                              initialCompleted: c ? c.completed : null,
                              initialAmount: c?.amount ?? null,
                              initialPhotoUrl: c?.photoUrl ?? null,
                              unit: a.unit,
                              target: a.redeemedTargetAmount ?? a.targetAmount,
                            };
                          })}
                        />
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Legend() {
  const items: { state: CellState["state"]; label: string }[] = [
    { state: "done", label: "Done" },
    { state: "missed", label: "Did not do" },
    { state: "unmarked", label: "Unmarked" },
    { state: "pending", label: "In grace" },
    { state: "future", label: "Future" },
  ];
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
      {items.map((i) => (
        <span key={i.state} className="flex items-center gap-1.5">
          <span
            className={cn(
              "h-3 w-3 rounded-sm border border-border/50",
              cellTone(i.state, false),
            )}
            aria-hidden
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}
