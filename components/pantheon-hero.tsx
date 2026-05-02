import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import type { FaceCustomization } from "@/lib/face-config";

export interface PantheonHeroMember {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  customization: Partial<FaceCustomization>;
  todayState: "done" | "pending" | "awaiting" | "no-rites";
}

interface PantheonHeroProps {
  dayNumber: number;
  totalDays: number;
  ritesKept: number;
  ritesPossible: number;
  members: PantheonHeroMember[];
  challengeStarted: boolean;
  challengeOver: boolean;
}

export function PantheonHero({
  dayNumber,
  totalDays,
  ritesKept,
  ritesPossible,
  members,
  challengeStarted,
  challengeOver,
}: PantheonHeroProps) {
  if (members.length === 0) return null;

  const kept = members.filter((m) => m.todayState === "done");
  const awaited = members.filter(
    (m) => m.todayState === "pending" || m.todayState === "awaiting",
  );
  const onlyTallies = members.filter((m) => m.todayState === "no-rites");

  const ritePct =
    ritesPossible > 0
      ? Math.min(100, Math.round((ritesKept / ritesPossible) * 100))
      : 0;
  const dayPct = Math.min(
    100,
    Math.round((Math.max(0, dayNumber) / totalDays) * 100),
  );

  const ledeLabel = challengeOver
    ? "The reckoning, sealed"
    : challengeStarted
      ? "Today's reckoning"
      : "The ritual stands ready";

  const ledeBody = challengeOver
    ? `The ritual is complete — ${ritesKept} of ${ritesPossible} daily rites kept`
    : challengeStarted
      ? kept.length === members.length
        ? `Day ${dayNumber} of ${totalDays} — every mortal hath made today's offering`
        : `Day ${dayNumber} of ${totalDays} — ${kept.length} of ${members.length - onlyTallies.length} have made today's offering`
      : `The ritual opens at the dawn of May 1st — ${members.length} mortal${members.length === 1 ? "" : "s"} stand pledged`;

  return (
    <Card className="marble-card overflow-hidden border-border/60">
      <CardContent className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="font-display text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
              {ledeLabel}
            </p>
            <p className="mt-1 font-display text-2xl tracking-tight md:text-3xl">
              {ledeBody}
            </p>
          </div>
          {challengeStarted && ritesPossible > 0 && (
            <div className="text-right">
              <p className="font-display text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
                Rites kept thus far
              </p>
              <p className="mt-1 font-display text-2xl tracking-tight">
                {ritesKept}
                <span className="text-muted-foreground"> / {ritesPossible}</span>
              </p>
            </div>
          )}
        </div>

        {challengeStarted && (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-[0.6rem] font-display uppercase tracking-[0.3em] text-muted-foreground">
              <span>The pantheon&apos;s standing</span>
              <span>{ritePct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border/60">
              <div
                className="h-full rounded-full bg-gold transition-[width]"
                style={{ width: `${ritePct}%` }}
              />
            </div>
            <div className="flex items-baseline justify-between text-[0.6rem] font-display uppercase tracking-[0.3em] text-muted-foreground">
              <span>Days elapsed</span>
              <span>
                {Math.max(0, dayNumber)} / {totalDays}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-border/60">
              <div
                className="h-full rounded-full bg-divine/60 transition-[width]"
                style={{ width: `${dayPct}%` }}
              />
            </div>
          </div>
        )}

        {challengeStarted && !challengeOver && (
          <div className="grid gap-4 md:grid-cols-2">
            <HeroRoster
              tone="kept"
              label={`Kept the vow today · ${kept.length}`}
              empty="None yet — the day is young"
              members={kept}
            />
            <HeroRoster
              tone="awaited"
              label={`Awaited at the altar · ${awaited.length}`}
              empty="The whole pantheon hath answered"
              members={awaited}
            />
          </div>
        )}

        {challengeStarted && onlyTallies.length > 0 && (
          <p className="text-[0.65rem] font-display uppercase tracking-[0.3em] text-muted-foreground">
            {onlyTallies.length} mortal
            {onlyTallies.length === 1 ? " keeps" : "s keep"} only weekly or
            monthly tallies — not reckoned by the day
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function HeroRoster({
  tone,
  label,
  empty,
  members,
}: {
  tone: "kept" | "awaited";
  label: string;
  empty: string;
  members: PantheonHeroMember[];
}) {
  const labelTone =
    tone === "kept" ? "text-gold-foreground" : "text-muted-foreground";

  return (
    <div>
      <p
        className={`mb-2 font-display text-[0.65rem] uppercase tracking-[0.3em] ${labelTone}`}
      >
        {label}
      </p>
      {members.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <HeroAvatar key={m.id} tone={tone} member={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function HeroAvatar({
  tone,
  member,
}: {
  tone: "kept" | "awaited";
  member: PantheonHeroMember;
}) {
  const isKept = tone === "kept";
  const wrapperTone = isKept
    ? "border-gold/50 bg-gold/10"
    : "border-border/40 bg-background/40";
  const ringTone = isKept ? "ring-2 ring-gold/70" : "ring-1 ring-border/60";
  const nameTone = isKept ? "text-foreground" : "text-muted-foreground";

  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-2 py-1 ${wrapperTone}`}
      title={
        isKept
          ? `${member.displayName} — kept today's vow`
          : `${member.displayName} — yet to make their offering`
      }
    >
      <div className="relative">
        <UserAvatar
          name={member.displayName}
          src={member.avatarUrl}
          size={28}
          ringClassName={ringTone}
          className={isKept ? "" : "opacity-70 grayscale"}
        />
        {isKept && (
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gold text-[0.5rem] font-bold text-gold-foreground ring-1 ring-background"
          >
            ✓
          </span>
        )}
      </div>
      <span className={`pr-1 text-xs font-medium ${nameTone}`}>
        {member.displayName}
      </span>
    </div>
  );
}
