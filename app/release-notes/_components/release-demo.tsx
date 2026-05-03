"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  PantheonHero,
  type PantheonHeroMember,
} from "@/components/pantheon-hero";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

import type { ReleaseDemoKind } from "@/lib/release-notes";

export function ReleaseDemo({ kind }: { kind: ReleaseDemoKind }) {
  switch (kind) {
    case "herald-hero":
      return <HeraldHeroDemo />;
    case "day-complete":
      return <DayCompleteDemo />;
    case "lockout-grace":
      return <LockoutGraceDemo />;
    case "daily-recap":
      return <DailyRecapDemo />;
    case "visages":
      return <VisagesDemo />;
  }
}

const SAMPLE_MEMBERS: PantheonHeroMember[] = [
  { id: "1", displayName: "Apollo", avatarUrl: null, customization: {}, todayState: "done" },
  { id: "2", displayName: "Athena", avatarUrl: null, customization: {}, todayState: "done" },
  { id: "3", displayName: "Hermes", avatarUrl: null, customization: {}, todayState: "done" },
  { id: "4", displayName: "Artemis", avatarUrl: null, customization: {}, todayState: "pending" },
  { id: "5", displayName: "Dionysus", avatarUrl: null, customization: {}, todayState: "pending" },
  { id: "6", displayName: "Hephaestus", avatarUrl: null, customization: {}, todayState: "no-rites" },
];

function HeraldHeroDemo() {
  return (
    <PantheonHero
      dayNumber={3}
      totalDays={31}
      ritesKept={28}
      ritesPossible={45}
      members={SAMPLE_MEMBERS}
      challengeStarted
      challengeOver={false}
    />
  );
}

const DAY_COMPLETE_RITES = [
  { id: "r1", label: "Run 5km before noon", kind: "do" as const },
  { id: "r2", label: "Practise the lyre, thirty minutes", kind: "do" as const },
  { id: "r3", label: "Abstain from the wine", kind: "abstain" as const },
];

function DayCompleteDemo() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const allDone = DAY_COMPLETE_RITES.every((r) => done[r.id]);
  const [dismissed, setDismissed] = useState(false);

  function toggle(id: string) {
    setDismissed(false);
    setDone((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function reset() {
    setDone({});
    setDismissed(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {DAY_COMPLETE_RITES.map((rite) => {
        const isDone = !!done[rite.id];
        const tone = isDone
          ? rite.kind === "abstain"
            ? "border-fallen/60 bg-fallen/10"
            : "border-divine/60 bg-divine/10"
          : rite.kind === "abstain"
            ? "border-fallen/40 bg-fallen/5"
            : "border-divine/30 bg-divine/5";
        const doneLabel = rite.kind === "abstain" ? "Refrained" : "Done";
        const markLabel =
          rite.kind === "abstain" ? "Mark refrained" : "Mark done";
        return (
          <div
            key={rite.id}
            className={cn(
              "flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between",
              tone,
            )}
          >
            <div className="flex flex-1 flex-col gap-1">
              <p className="font-display text-lg leading-tight">{rite.label}</p>
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
                {rite.kind === "abstain" ? "Abstain" : "Do daily"}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={isDone ? "default" : "outline"}
              onClick={() => toggle(rite.id)}
              aria-pressed={isDone}
              className={cn(
                "font-display tracking-widest",
                isDone && "gilded",
              )}
            >
              {isDone ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {doneLabel}
                </>
              ) : (
                markLabel
              )}
            </Button>
          </div>
        );
      })}

      {allDone && !dismissed && (
        <Card className="marble-card mt-4 border-gold/40">
          <CardContent className="flex flex-col gap-3 p-6">
            <p className="font-display text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
              The day is sealed
            </p>
            <p className="font-display text-2xl tracking-tight">
              Every rite kept — the parchment is ready
            </p>
            <p className="italic text-muted-foreground">
              Thy deeds bound to thy vow. Strike the parchment to the wider
              world, that the public square may witness how the day was met.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button className="gilded font-display tracking-widest">
                Share
              </Button>
              <Button
                variant="outline"
                className="font-display tracking-widest"
              >
                Download
              </Button>
              <Button
                variant="outline"
                className="font-display tracking-widest"
              >
                Copy link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs italic text-muted-foreground">
          A live preview, with placeholder rites — toggle each to see the
          benediction parchment rise.
        </p>
        {(allDone || dismissed) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="font-display tracking-widest"
          >
            Reset demo
          </Button>
        )}
      </div>
    </div>
  );
}

const YESTERDAY_RITES = [
  { id: "y1", label: "Read for thirty minutes" },
  { id: "y2", label: "Walk one league" },
];

function LockoutGraceDemo() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  return (
    <Card className="marble-card border-divine/40">
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <p className="font-display text-[0.65rem] uppercase tracking-[0.4em] text-divine">
            Yesterday — the lockout flips at noon
          </p>
          <p className="font-display text-2xl tracking-tight">
            Two rites await thy mark
          </p>
          <p className="text-sm italic text-muted-foreground">
            Strikes do not accrue, streaks do not break, and falls do not
            trigger until the noon bell rings.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {YESTERDAY_RITES.map((rite) => {
            const isDone = !!done[rite.id];
            return (
              <div
                key={rite.id}
                className={cn(
                  "flex items-center justify-between rounded-md border p-3",
                  isDone
                    ? "border-divine/60 bg-divine/10"
                    : "border-divine/30 bg-divine/5",
                )}
              >
                <p className="font-display">{rite.label}</p>
                <Button
                  type="button"
                  size="sm"
                  variant={isDone ? "default" : "outline"}
                  onClick={() =>
                    setDone((prev) => ({ ...prev, [rite.id]: !prev[rite.id] }))
                  }
                  className={cn(
                    "font-display tracking-widest",
                    isDone && "gilded",
                  )}
                >
                  {isDone ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Done
                    </>
                  ) : (
                    "Mark done"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

const RECAP_PROOFS: Array<{
  id: string;
  name: string;
  rite: string;
  kind: "image" | "video" | "audio";
  src: string;
}> = [
  {
    id: "p1",
    name: "Apollo",
    rite: "5km run",
    kind: "image",
    src: "/release-notes/demo/proof-run.svg",
  },
  {
    id: "p2",
    name: "Athena",
    rite: "Hour of writing",
    kind: "video",
    src: "/release-notes/demo/proof-writing.svg",
  },
  {
    id: "p3",
    name: "Hermes",
    rite: "Lyre practice",
    kind: "audio",
    src: "/release-notes/demo/proof-lyre.svg",
  },
];

function DailyRecapDemo() {
  return (
    <Card className="marble-card">
      <CardContent className="flex flex-col gap-5 p-6">
        <div>
          <p className="font-display text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
            The pantheon at dusk
          </p>
          <p className="mt-1 font-display text-2xl tracking-tight">
            Three witnesses inscribed, two awaited
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {RECAP_PROOFS.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/40 p-3"
            >
              <ProofTile kind={p.kind} src={p.src} alt={`${p.name} — ${p.rite}`} />
              <div>
                <p className="font-display text-sm">{p.name}</p>
                <p className="text-xs italic text-muted-foreground">
                  {p.rite}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Awaited · Artemis, Dionysus
        </p>

        <div className="rounded-md border border-gold/30 bg-gold/[0.04] p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
              The collective post · last touched by Athena, 6:42 pm
            </p>
            <button
              type="button"
              className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-gold/80"
            >
              Amend
            </button>
          </div>
          <p className="mt-2 font-display italic">
            &ldquo;Hard one this morning. Wind off the river the whole way.
            Took the long route past the agora — finished a minute slower than
            yesterday but the legs did not betray me. Onward.&rdquo;
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProofTile({
  kind,
  src,
  alt,
}: {
  kind: "image" | "video" | "audio";
  src: string;
  alt: string;
}) {
  const badge =
    kind === "image" ? null : (
      <span className="absolute left-1.5 top-1.5 rounded-sm bg-black/60 px-1.5 py-0.5 font-display text-[0.55rem] uppercase tracking-[0.25em] text-white/85">
        {kind === "video" ? "Film" : "Song"}
      </span>
    );
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-md border border-gold/30 bg-card">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 33vw, 200px"
        className="object-cover"
      />
      {badge}
    </div>
  );
}

const VISAGE_NAMES = [
  "Apollo",
  "Athena",
  "Hermes",
  "Artemis",
  "Dionysus",
  "Hephaestus",
  "Demeter",
  "Poseidon",
];

function VisagesDemo() {
  const names = useMemo(() => VISAGE_NAMES, []);
  return (
    <div className="grid grid-cols-4 gap-4 sm:grid-cols-8">
      {names.map((name) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <UserAvatar name={name} size={64} ringClassName="ring-2 ring-gold/40" />
          <span className="font-display text-xs">{name}</span>
        </div>
      ))}
    </div>
  );
}

export function ReleaseDemoFrame({
  caption,
  children,
}: {
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="my-8 flex flex-col gap-3">
      <div className="rounded-lg border border-border/60 bg-card/40 p-4 md:p-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-[0.6rem] uppercase tracking-[0.4em] text-muted-foreground">
            Live in the temple
          </span>
          <Link
            href="/check-in"
            className="inline-flex items-center gap-1 font-display text-[0.6rem] uppercase tracking-[0.3em] text-gold hover:underline"
          >
            Try it <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {children}
      </div>
      {caption && (
        <figcaption className="text-center text-xs italic text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
