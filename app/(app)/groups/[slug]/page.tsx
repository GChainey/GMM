import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  dailyCheckins,
  groupMemberships,
  groups,
  pledgeOptions,
  pledges,
  users,
} from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { buildCells, computeStatus } from "@/lib/status";
import { challengeDates } from "@/lib/dates";
import { StatusGlyph } from "@/components/status-glyph";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { Settings } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PantheonPage({ params }: PageProps) {
  const { slug } = await params;
  const userId = await requireUserId();

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);
  if (!group) notFound();

  const myMembership = await db
    .select()
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, group.id),
        eq(groupMemberships.userId, userId),
      ),
    )
    .limit(1);

  if (myMembership.length === 0 && !group.isPublic) {
    notFound();
  }

  const memberRows = await db
    .select({
      membership: groupMemberships,
      user: users,
    })
    .from(groupMemberships)
    .innerJoin(users, eq(users.id, groupMemberships.userId))
    .where(eq(groupMemberships.groupId, group.id));

  const memberIds = memberRows.map((m) => m.user.id);

  const allPledges = memberIds.length
    ? await db
        .select()
        .from(pledges)
        .where(eq(pledges.groupId, group.id))
    : [];
  const pledgeIds = allPledges.map((p) => p.id);
  const allActivities = pledgeIds.length
    ? await db
        .select()
        .from(activities)
        .where(inArray(activities.pledgeId, pledgeIds))
    : [];
  const activityIds = allActivities.map((a) => a.id);
  const allCheckins = activityIds.length
    ? await db
        .select()
        .from(dailyCheckins)
        .where(inArray(dailyCheckins.activityId, activityIds))
    : [];

  const optionIds = Array.from(
    new Set(
      allPledges
        .flatMap((p) => [p.rewardOptionId, p.punishmentOptionId])
        .filter((v): v is string => Boolean(v)),
    ),
  );
  const optionRows = optionIds.length
    ? await db
        .select()
        .from(pledgeOptions)
        .where(inArray(pledgeOptions.id, optionIds))
    : [];
  const optionLabelById = new Map(optionRows.map((o) => [o.id, o.label]));

  const dates = challengeDates();
  const isOwner = group.ownerId === userId;
  const isMember = myMembership.length > 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">
            {group.isPublic ? "OPEN PANTHEON" : "SEALED PANTHEON"}
          </p>
          <h1 className="mt-2 font-display text-4xl tracking-tight md:text-6xl">
            {group.name}
          </h1>
          {group.description && (
            <p className="mt-2 max-w-2xl text-muted-foreground">
              {group.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="font-display">
              {group.strikeLimit === 0
                ? "No strikes"
                : `${group.strikeLimit} strikes allowed`}
            </Badge>
            <Badge variant="outline" className="font-display">
              {memberRows.length} mortal{memberRows.length === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isMember && (
            <Button asChild className="gilded font-display tracking-widest">
              <Link href={`/groups/${slug}/join`}>Take the vow</Link>
            </Button>
          )}
          {isMember && (
            <Button
              asChild
              variant="outline"
              className="font-display tracking-widest"
            >
              <Link href={`/groups/${slug}/pledge/edit`}>Mine own pledge</Link>
            </Button>
          )}
          {isOwner && (
            <Button asChild variant="outline" size="icon" aria-label="Settings">
              <Link href={`/groups/${slug}/settings`}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {memberRows.map(({ user, membership }) => {
          const pledge = allPledges.find((p) => p.userId === user.id);
          const acts = pledge
            ? allActivities.filter((a) => a.pledgeId === pledge.id)
            : [];
          const checks = allCheckins
            .filter((c) => acts.some((a) => a.id === c.activityId))
            .map((c) => ({
              activityId: c.activityId,
              date: typeof c.date === "string" ? c.date : String(c.date),
              completed: c.completed,
              amount: c.amount,
            }));
          const actLite = acts.map((a) => ({
            id: a.id,
            kind: (a.kind as "do" | "abstain" | "monthly_total") ?? "do",
            targetAmount: a.targetAmount,
          }));
          const status = computeStatus({
            activities: actLite,
            checkins: checks,
            strikeLimit: group.strikeLimit,
            timezone: user.timezone ?? "UTC",
          });
          const cells = buildCells(actLite, checks, user.timezone ?? "UTC");

          return (
            <Card
              key={user.id}
              className="marble-card overflow-hidden border-border/60"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={user.displayName}
                      src={user.avatarUrl}
                      size={48}
                      customization={{
                        faceStyle: user.faceStyle,
                        faceColor: user.faceColor,
                        faceGaze: user.faceGaze,
                        faceDepth: user.faceDepth,
                      }}
                    />
                    <div>
                      <p className="font-display text-2xl tracking-tight">
                        {user.displayName}
                      </p>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        {membership.role === "owner" ? "FOUNDER" : "MORTAL"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusGlyph status={status.status} />
                    <p className="text-xs text-muted-foreground">
                      {status.strikes} strike{status.strikes === 1 ? "" : "s"} ·
                      🔥 {status.currentStreak} day
                      {status.currentStreak === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                {pledge ? (
                  <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
                    <PledgeBlock label="Pledge" body={pledge.pledgeText} italic />
                    <PledgeBlock
                      label="Reward"
                      kindLabel={
                        pledge.rewardOptionId
                          ? optionLabelById.get(pledge.rewardOptionId)
                          : null
                      }
                      body={pledge.rewardText}
                    />
                    <PledgeBlock
                      label="Punishment"
                      kindLabel={
                        pledge.punishmentOptionId
                          ? optionLabelById.get(pledge.punishmentOptionId)
                          : null
                      }
                      body={pledge.punishmentText}
                    />
                  </div>
                ) : (
                  <p className="font-display italic text-muted-foreground">
                    No pledge inscribed yet.
                  </p>
                )}

                {acts.length > 0 && (
                  <div className="mt-2 flex flex-col gap-3">
                    <div>
                      <p className="mb-2 font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        Rites & tallies — May
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {acts.map((a) => {
                          const kind = a.kind ?? "do";
                          const tone =
                            kind === "abstain"
                              ? "border-fallen/50 bg-fallen/10 text-fallen"
                              : kind === "monthly_total"
                                ? "border-gold/60 bg-gold/10 text-gold-foreground"
                                : "border-divine/40 bg-divine/10";
                          return (
                            <Badge
                              key={a.id}
                              variant="outline"
                              className={`font-normal ${tone}`}
                            >
                              {kind === "abstain" && "✗ "}
                              {kind === "monthly_total" && "Σ "}
                              {a.label}
                              {kind === "monthly_total" && a.targetAmount && (
                                <span className="ml-1 opacity-70">
                                  /{a.targetAmount}
                                  {a.unit ? ` ${a.unit}` : ""}
                                </span>
                              )}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    {status.monthlyProgress.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {status.monthlyProgress.map((mp) => {
                          const a = acts.find((x) => x.id === mp.activityId);
                          if (!a) return null;
                          return (
                            <div
                              key={mp.activityId}
                              className="rounded-md border border-gold/40 bg-gold/5 p-3"
                            >
                              <div className="flex items-baseline justify-between gap-3">
                                <p className="font-display text-sm tracking-tight">
                                  {a.label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {mp.total}
                                  {a.unit ? ` ${a.unit}` : ""} /{" "}
                                  {mp.target}
                                  {a.unit ? ` ${a.unit}` : ""}
                                </p>
                              </div>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-border/60">
                                <div
                                  className={`h-full rounded-full transition-[width] ${mp.reached ? "bg-ascended" : "bg-gold"}`}
                                  style={{
                                    width: `${(mp.ratio * 100).toFixed(1)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {acts.some(
                      (a) => a.kind === "do" || a.kind === "abstain",
                    ) && (
                      <div className="grid grid-cols-[repeat(31,minmax(0,1fr))] gap-1">
                        {dates.map((d) => {
                          const cell = cells.get(d);
                          const day = Number(d.slice(8));
                          const tone =
                            cell?.state === "done"
                              ? "bg-gold/80 text-gold-foreground"
                              : cell?.state === "missed"
                                ? "bg-fallen/80 text-primary-foreground"
                                : cell?.state === "pending"
                                  ? "bg-divine/30 text-foreground"
                                  : "bg-muted text-muted-foreground/60";
                          return (
                            <div
                              key={d}
                              title={`${d} — ${cell?.state ?? "future"}`}
                              className={`flex aspect-square items-center justify-center rounded-sm border border-border/40 text-[0.65rem] font-medium ${tone}`}
                            >
                              {day}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function PledgeBlock({
  label,
  body,
  italic,
  kindLabel,
}: {
  label: string;
  body: string;
  italic?: boolean;
  kindLabel?: string | null;
}) {
  return (
    <div className="rounded-md border border-border/50 bg-background/40 p-3">
      <p className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </p>
      {kindLabel && (
        <p className="mt-1 inline-block rounded-sm border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-widest text-gold-foreground">
          {kindLabel}
        </p>
      )}
      <p
        className={`mt-1 whitespace-pre-line text-sm ${italic ? "italic" : ""} ${body ? "" : "text-muted-foreground"}`}
      >
        {body || (kindLabel ? "" : "—")}
      </p>
    </div>
  );
}
