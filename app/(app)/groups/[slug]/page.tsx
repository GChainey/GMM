import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  dailyCheckins,
  goalSwaps,
  groupMemberships,
  groups,
  pledgeOptions,
  pledges,
  users,
} from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import {
  buildCells,
  canSeekRedemption,
  computeStatus,
  redemptionDeadline,
} from "@/lib/status";
import {
  challengeDates,
  hasChallengeStarted,
  isChallengeOver,
  resolveToday,
} from "@/lib/dates";
import { StatusGlyph } from "@/components/status-glyph";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { OutcomeBlock } from "@/components/outcome-block";
import { RedemptionBanner } from "@/components/redemption-banner";
import { Settings, Share2, Shuffle } from "lucide-react";
import { SwapControls } from "@/components/swap-controls";

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
  const todayIso = await resolveToday("UTC");
  const isOwner = group.ownerId === userId;
  const isMember = myMembership.length > 0;

  const todaySwaps = isMember
    ? await db
        .select()
        .from(goalSwaps)
        .where(
          and(
            eq(goalSwaps.groupId, group.id),
            eq(goalSwaps.swapDate, todayIso),
            inArray(goalSwaps.status, ["pending", "accepted"]),
          ),
        )
    : [];

  const userNameById = new Map(memberRows.map((m) => [m.user.id, m.user.displayName]));

  const myPending = todaySwaps
    .filter(
      (s) =>
        s.status === "pending" &&
        (s.initiatorUserId === userId || s.targetUserId === userId),
    )
    .map((s) => ({
      swapId: s.id,
      initiatorUserId: s.initiatorUserId,
      initiatorName: userNameById.get(s.initiatorUserId) ?? "—",
      targetUserId: s.targetUserId,
      targetName: userNameById.get(s.targetUserId) ?? "—",
      amTarget: s.targetUserId === userId,
    }));

  const myAcceptedSwap = todaySwaps.find(
    (s) =>
      s.status === "accepted" &&
      (s.initiatorUserId === userId || s.targetUserId === userId),
  );
  const myActive = myAcceptedSwap
    ? {
        swapId: myAcceptedSwap.id,
        partnerName:
          userNameById.get(
            myAcceptedSwap.initiatorUserId === userId
              ? myAcceptedSwap.targetUserId
              : myAcceptedSwap.initiatorUserId,
          ) ?? "another mortal",
      }
    : null;

  // Map of "today my partner is X" for every accepted-swap member.
  const acceptedPartnerByUser = new Map<string, { id: string; name: string }>();
  for (const s of todaySwaps) {
    if (s.status !== "accepted") continue;
    const a = s.initiatorUserId;
    const b = s.targetUserId;
    acceptedPartnerByUser.set(a, { id: b, name: userNameById.get(b) ?? "—" });
    acceptedPartnerByUser.set(b, { id: a, name: userNameById.get(a) ?? "—" });
  }

  const challengeStarted = hasChallengeStarted(todayIso);
  const challengeOver = isChallengeOver(todayIso);
  const swapDisabledReason = !isMember
    ? "Take the vow to invoke chaos."
    : !challengeStarted
      ? "The Switching opens with the ritual on May 1st."
      : challengeOver
        ? "The ritual is sealed."
        : null;

  const candidates = memberRows
    .filter((m) => m.user.id !== userId)
    .filter((m) => !acceptedPartnerByUser.has(m.user.id))
    .map((m) => ({ userId: m.user.id, displayName: m.user.displayName }));

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
            {group.charityModeEnabled && (
              <Badge
                variant="outline"
                className="border-divine/50 bg-divine/10 font-display text-divine"
              >
                Charity mode ·{" "}
                {group.charitySelection === "admin" ? "founder picks" : "each picks"}
              </Badge>
            )}
          </div>
          {group.charityModeEnabled && (
            <p className="mt-2 max-w-2xl text-xs italic text-muted-foreground">
              When a mortal falls, their forfeit flows to{" "}
              {group.charitySelection === "admin" ? (
                <>
                  the pantheon&apos;s chosen cause:{" "}
                  <span className="font-display not-italic tracking-wide text-foreground">
                    {group.charityName || "(unnamed)"}
                  </span>
                  {group.charityUrl && (
                    <>
                      {" "}
                      —{" "}
                      <a
                        href={group.charityUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        link
                      </a>
                    </>
                  )}
                  .
                </>
              ) : (
                <>the winner&apos;s chosen charity. Each mortal names their own.</>
              )}
            </p>
          )}
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
          {challengeStarted && (
            <Button
              asChild
              variant="outline"
              className="font-display tracking-widest"
            >
              <Link href={`/share/group/${slug}/${todayIso}`}>
                <Share2 className="h-4 w-4" />
                Share roundup
              </Link>
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

      {isMember && (
        <SwapControls
          slug={slug}
          candidates={candidates}
          pending={myPending}
          active={myActive}
          disabledReason={swapDisabledReason}
        />
      )}

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
            kind:
              (a.kind as
                | "do"
                | "abstain"
                | "weekly_tally"
                | "monthly_total") ?? "do",
            targetAmount: a.targetAmount,
            redeemedTargetAmount: a.redeemedTargetAmount,
          }));
          const status = computeStatus({
            activities: actLite,
            checkins: checks,
            strikeLimit: group.strikeLimit,
            todayIso,
            redemptionStartedOn: pledge?.redemptionStartedOn ?? null,
            redeemedStrikeLimit: pledge?.redeemedStrikeLimit ?? null,
          });
          const cells = buildCells(actLite, checks, todayIso);
          const isMe = user.id === userId;
          const showRedemptionBanner = isMe && canSeekRedemption(status);
          const banner = showRedemptionBanner ? (() => {
            const deadline = redemptionDeadline(status.fallenOn ?? todayIso);
            const ms =
              new Date(`${deadline}T00:00:00Z`).getTime() -
              new Date(`${todayIso}T00:00:00Z`).getTime();
            const daysLeft = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
            return <RedemptionBanner slug={slug} daysLeft={daysLeft} />;
          })() : null;

          return (
            <Card
              key={user.id}
              className="marble-card overflow-hidden border-border/60"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                {banner}
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
                      {acceptedPartnerByUser.has(user.id) && (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-sm border border-divine/40 bg-divine/10 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-widest text-divine">
                          <Shuffle className="h-3 w-3" />
                          Switched today with{" "}
                          {acceptedPartnerByUser.get(user.id)?.name}
                        </p>
                      )}
                      {status.isRedeemed && status.status === "penitent" && (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-sm border border-penitent/40 bg-penitent/10 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-widest text-penitent">
                          The second vow · since{" "}
                          {pledge?.redemptionStartedOn ?? "—"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusGlyph
                      status={status.status}
                      reclaimed={status.reclaimed}
                    />
                    <p className="text-xs text-muted-foreground">
                      {status.strikes} strike{status.strikes === 1 ? "" : "s"} ·
                      🔥 {status.currentStreak} day
                      {status.currentStreak === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                {pledge ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
                      <PledgeBlock
                        label="Pledge"
                        body={pledge.pledgeText}
                        italic
                      />
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
                    {group.charityModeEnabled &&
                      group.charitySelection === "individual" &&
                      pledge.charityName && (
                        <div className="rounded-md border border-divine/40 bg-divine/5 p-3 text-sm">
                          <p className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
                            Champions the cause
                          </p>
                          <p className="mt-1">
                            <span className="font-display tracking-wide">
                              {pledge.charityName}
                            </span>
                            {pledge.charityUrl && (
                              <>
                                {" "}
                                —{" "}
                                <a
                                  href={pledge.charityUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline"
                                >
                                  link
                                </a>
                              </>
                            )}
                          </p>
                        </div>
                      )}
                    {acts.some((a) => a.outcomeText.trim() || user.id === userId) && (
                      <div className="flex flex-col gap-2">
                        {acts.map((a) => (
                          <OutcomeBlock
                            key={a.id}
                            slug={slug}
                            activityId={a.id}
                            activityLabel={a.label}
                            outcomeText={a.outcomeText}
                            achievedAt={
                              a.outcomeAchievedAt
                                ? a.outcomeAchievedAt.toISOString()
                                : null
                            }
                            canEdit={user.id === userId}
                          />
                        ))}
                      </div>
                    )}
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
                                : kind === "weekly_tally"
                                  ? "border-gold/40 bg-gold/[0.06] text-gold-foreground"
                                  : "border-divine/40 bg-divine/10";
                          return (
                            <Badge
                              key={a.id}
                              variant="outline"
                              className={`font-normal ${tone}`}
                            >
                              {kind === "abstain" && "✗ "}
                              {kind === "monthly_total" && "Σ "}
                              {kind === "weekly_tally" && "≋ "}
                              {a.label}
                              {kind === "monthly_total" && a.targetAmount && (
                                <span className="ml-1 opacity-70">
                                  /{a.redeemedTargetAmount ?? a.targetAmount}
                                  {a.unit ? ` ${a.unit}` : ""}
                                </span>
                              )}
                              {kind === "weekly_tally" && a.targetAmount && (
                                <span className="ml-1 opacity-70">
                                  /{a.targetAmount}
                                  {a.unit ? ` ${a.unit}` : ""} per week
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

                    {status.weeklyProgress.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {Array.from(
                          new Set(
                            status.weeklyProgress.map((wp) => wp.activityId),
                          ),
                        ).map((activityId) => {
                          const a = acts.find((x) => x.id === activityId);
                          if (!a) return null;
                          const weeks = status.weeklyProgress.filter(
                            (wp) => wp.activityId === activityId,
                          );
                          return (
                            <div
                              key={activityId}
                              className="rounded-md border border-gold/40 bg-gold/[0.04] p-3"
                            >
                              <div className="flex items-baseline justify-between gap-3">
                                <p className="font-display text-sm tracking-tight">
                                  {a.label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {a.targetAmount}
                                  {a.unit ? ` ${a.unit}` : ""} /week
                                </p>
                              </div>
                              <div className="mt-2 grid grid-cols-5 gap-1">
                                {weeks.map((wp) => {
                                  const tone = wp.isPast
                                    ? wp.reached
                                      ? "bg-ascended/80"
                                      : "bg-fallen/80"
                                    : wp.isCurrent
                                      ? wp.reached
                                        ? "bg-ascended/70"
                                        : "bg-gold/70"
                                      : "bg-muted";
                                  const width = `${(wp.ratio * 100).toFixed(1)}%`;
                                  return (
                                    <div
                                      key={wp.weekIndex}
                                      title={`Wk ${wp.weekLabel} (${wp.weekStartIso}–${wp.weekEndIso}) — ${wp.total} / ${wp.target}`}
                                      className="flex flex-col gap-1"
                                    >
                                      <div className="flex items-baseline justify-between text-[0.6rem] uppercase tracking-widest text-muted-foreground">
                                        <span>Wk {wp.weekLabel}</span>
                                        <span className="text-foreground">
                                          {wp.total}/{wp.target}
                                        </span>
                                      </div>
                                      <div className="h-2 overflow-hidden rounded-full bg-border/60">
                                        <div
                                          className={`h-full rounded-full transition-[width] ${tone}`}
                                          style={{ width }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
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
