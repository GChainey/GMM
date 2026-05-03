"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  FileVideo,
  Heart,
  Music,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  castProofVoteAction,
  saveCollectivePostAction,
} from "@/app/(app)/groups/[slug]/recap-actions";
import { classifyProofUrl } from "@/lib/proof-media";
import type { FaceCustomization } from "@/lib/face-config";
import { cn } from "@/lib/utils";

interface MemberPhoto {
  checkinId: string;
  url: string;
  activityLabel: string;
  voteCount: number;
  hasMyVote: boolean;
}

export interface RecapMember {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  customization: Partial<FaceCustomization>;
  photos: MemberPhoto[];
}

export interface CollectivePostState {
  body: string;
  author: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    customization: Partial<FaceCustomization>;
  } | null;
  updatedAt: string | null;
}

interface PantheonDailyRecapProps {
  slug: string;
  groupId: string;
  groupName: string;
  date: string;
  members: RecapMember[];
  isMember: boolean;
  currentUserId: string;
  initialPost: CollectivePostState;
}

interface FlatProof {
  checkinId: string;
  url: string;
  activityLabel: string;
  voteCount: number;
  hasMyVote: boolean;
  member: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    customization: Partial<FaceCustomization>;
  };
}

function ProofMediaThumb({
  url,
  size,
  onOpen,
}: {
  url: string;
  size: number;
  onOpen?: () => void;
}) {
  const kind = classifyProofUrl(url);
  if (kind === "image" && onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="relative block overflow-hidden rounded-md border border-gold/40 transition hover:border-gold"
        style={{ width: size, height: size }}
        aria-label="Open proof"
      >
        <Image
          src={url}
          alt="proof"
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized
        />
      </button>
    );
  }
  if (kind === "image") {
    return (
      <span
        className="relative block overflow-hidden rounded-md border border-gold/40"
        style={{ width: size, height: size }}
      >
        <Image
          src={url}
          alt="proof"
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized
        />
      </span>
    );
  }
  const Icon = kind === "video" ? FileVideo : Music;
  const label = kind === "video" ? "Video" : kind === "audio" ? "Audio" : "File";
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={`${label} proof — open`}
      className="flex items-center justify-center rounded-md border border-gold/40 bg-gold/10 text-gold/80 transition hover:bg-gold/20"
      style={{ width: size, height: size }}
    >
      <Icon className="h-5 w-5" />
      <span className="sr-only">Open {label.toLowerCase()} proof</span>
    </a>
  );
}

export function PantheonDailyRecap({
  slug,
  groupId,
  groupName,
  date,
  members,
  isMember,
  currentUserId,
  initialPost,
}: PantheonDailyRecapProps) {
  const [post, setPost] = useState<CollectivePostState>(initialPost);
  const hasPost = post.body.trim().length > 0 || Boolean(post.author);
  const [isEditing, setEditing] = useState(!hasPost && isMember);
  const [draftBody, setDraftBody] = useState(post.body);
  const [isSaving, startSaving] = useTransition();
  const [, startVoting] = useTransition();

  const [optimisticProofs, applyOptimisticVote] = useOptimistic(
    members,
    (state: RecapMember[], checkinId: string) => {
      const wasVoted =
        state.flatMap((m) => m.photos).find((p) => p.checkinId === checkinId)
          ?.hasMyVote ?? false;
      return state.map((m) => ({
        ...m,
        photos: m.photos.map((p) => {
          if (p.checkinId === checkinId) {
            return wasVoted
              ? {
                  ...p,
                  hasMyVote: false,
                  voteCount: Math.max(0, p.voteCount - 1),
                }
              : { ...p, hasMyVote: true, voteCount: p.voteCount + 1 };
          }
          if (!wasVoted && p.hasMyVote) {
            return {
              ...p,
              hasMyVote: false,
              voteCount: Math.max(0, p.voteCount - 1),
            };
          }
          return p;
        }),
      }));
    },
  );

  const flatProofs = useMemo<FlatProof[]>(
    () =>
      optimisticProofs.flatMap((m) =>
        m.photos
          .filter((p) => classifyProofUrl(p.url) === "image")
          .map((p) => ({
            checkinId: p.checkinId,
            url: p.url,
            activityLabel: p.activityLabel,
            voteCount: p.voteCount,
            hasMyVote: p.hasMyVote,
            member: {
              userId: m.userId,
              displayName: m.displayName,
              avatarUrl: m.avatarUrl,
              customization: m.customization,
            },
          })),
      ),
    [optimisticProofs],
  );

  // Hero recomputed from optimistic state so a fresh vote can flip the crown
  // before the server round-trip lands. flatProofs preserves server-side
  // createdAt ordering, so first-found at the max count is the tie-break winner.
  const optimisticHero = useMemo(() => {
    let bestId: string | null = null;
    let bestCount = 0;
    for (const p of flatProofs) {
      if (p.voteCount > bestCount) {
        bestCount = p.voteCount;
        bestId = p.checkinId;
      }
    }
    return bestId;
  }, [flatProofs]);

  const heroProof = optimisticHero
    ? flatProofs.find((p) => p.checkinId === optimisticHero) ?? null
    : null;

  const optimisticTotalVotes = useMemo(
    () => flatProofs.reduce((acc, p) => acc + p.voteCount, 0),
    [flatProofs],
  );

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lightboxOpen = lightboxIndex !== null;

  function openLightbox(checkinId: string) {
    const idx = flatProofs.findIndex((p) => p.checkinId === checkinId);
    if (idx >= 0) setLightboxIndex(idx);
  }

  const membersWithPhotos = optimisticProofs.filter((m) => m.photos.length > 0);
  const otherMembers = optimisticProofs.filter((m) => m.photos.length === 0);

  function startEdit() {
    setDraftBody(post.body);
    setEditing(true);
  }

  function cancelEdit() {
    if (!hasPost) return;
    setDraftBody(post.body);
    setEditing(false);
  }

  function save() {
    const trimmed = draftBody.trim();
    if (trimmed.length === 0) {
      toast.error("A recap needs words.");
      return;
    }
    startSaving(async () => {
      try {
        await saveCollectivePostAction({ groupId, date, body: trimmed });
        setPost((prev) => ({
          body: trimmed,
          author: {
            userId: currentUserId,
            displayName: prev.author?.userId === currentUserId
              ? prev.author.displayName
              : "Thee",
            avatarUrl: prev.author?.userId === currentUserId
              ? prev.author.avatarUrl
              : null,
            customization:
              prev.author?.userId === currentUserId
                ? prev.author.customization
                : {},
          },
          updatedAt: new Date().toISOString(),
        }));
        toast.success("Recap inscribed");
        setEditing(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not save";
        toast.error(msg);
      }
    });
  }

  function clearAll() {
    setDraftBody("");
    startSaving(async () => {
      try {
        await saveCollectivePostAction({ groupId, date, body: "" });
        setPost({ body: "", author: null, updatedAt: null });
        toast.success("Recap cleared");
        setEditing(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not save";
        toast.error(msg);
      }
    });
  }

  function vote(checkinId: string) {
    if (!isMember) {
      toast.error("Take the vow to vote.");
      return;
    }
    startVoting(async () => {
      applyOptimisticVote(checkinId);
      try {
        await castProofVoteAction({ groupId, date, checkinId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not vote";
        toast.error(msg);
      }
    });
  }

  const step = useCallback(
    (delta: number) => {
      setLightboxIndex((idx) => {
        if (idx === null || flatProofs.length === 0) return idx;
        return (idx + delta + flatProofs.length) % flatProofs.length;
      });
    },
    [flatProofs.length],
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, step]);

  const activeProof = lightboxIndex !== null ? flatProofs[lightboxIndex] : null;

  return (
    <section className="marble-card flex flex-col gap-5 rounded-md border border-gold/40 bg-gold/[0.04] p-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
            Today&apos;s recap · {groupName}
          </p>
          <h2 className="font-display text-2xl tracking-tight md:text-3xl">
            The pantheon at dusk
          </h2>
          <p className="mt-1 max-w-xl text-sm italic text-muted-foreground">
            What was kept, what was witnessed — the proofs of the day, gathered
            in one parchment.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="font-display tracking-widest"
        >
          <Link href={`/share/group/${slug}/${date}`}>Share roundup</Link>
        </Button>
      </header>

      {/* Tonight's keepsake — voted hero */}
      {heroProof ? (
        <div className="flex flex-col gap-3 rounded-md border border-gold/50 bg-gold/[0.06] p-4 md:flex-row">
          <button
            type="button"
            onClick={() => openLightbox(heroProof.checkinId)}
            className="relative aspect-square w-full max-w-xs overflow-hidden rounded-md border border-gold/40 transition hover:border-gold md:flex-shrink-0"
            aria-label="Open keepsake"
          >
            <Image
              src={heroProof.url}
              alt="keepsake"
              fill
              sizes="(min-width: 768px) 320px, 100vw"
              className="object-cover"
              unoptimized
            />
          </button>
          <div className="flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="inline-flex items-center gap-2 font-display text-[0.65rem] uppercase tracking-[0.3em] text-gold">
                <Crown className="h-3 w-3" /> Tonight&apos;s keepsake
              </p>
              <p className="font-display text-lg tracking-tight">
                {heroProof.member.displayName} — {heroProof.activityLabel}
              </p>
              <p className="text-xs italic text-muted-foreground">
                Crowned by {heroProof.voteCount} vote
                {heroProof.voteCount === 1 ? "" : "s"} of the pantheon.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <UserAvatar
                name={heroProof.member.displayName}
                src={heroProof.member.avatarUrl}
                size={28}
                customization={heroProof.member.customization}
              />
              <Button
                type="button"
                variant={heroProof.hasMyVote ? "default" : "outline"}
                size="sm"
                onClick={() => vote(heroProof.checkinId)}
                disabled={!isMember}
                className={cn(
                  "font-display tracking-widest",
                  heroProof.hasMyVote && "gilded",
                )}
              >
                <Heart
                  className={cn(
                    "mr-2 h-3 w-3",
                    heroProof.hasMyVote && "fill-current",
                  )}
                />
                {heroProof.hasMyVote ? "Honored" : "Honor"}
              </Button>
            </div>
          </div>
        </div>
      ) : flatProofs.length > 0 ? (
        <p className="rounded-md border border-dashed border-gold/40 bg-gold/[0.03] p-3 text-sm italic text-muted-foreground">
          No votes cast yet — honor a proof below to crown tonight&apos;s
          keepsake.
        </p>
      ) : null}

      {/* Collective post (body-only) */}
      <div className="rounded-md border border-border/60 bg-background/40 p-4">
        <p className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
          Collective post
        </p>

        {!isEditing && hasPost && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {post.author && (
                <UserAvatar
                  name={post.author.displayName}
                  src={post.author.avatarUrl}
                  size={36}
                  customization={post.author.customization}
                />
              )}
              <div className="flex flex-col">
                <p className="font-display text-sm tracking-tight">
                  {post.author?.displayName ?? "—"}
                </p>
                {post.updatedAt && (
                  <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                    {new Date(post.updatedAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
              {isMember && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto font-display tracking-widest"
                  onClick={startEdit}
                >
                  <Pencil className="mr-2 h-3 w-3" />
                  Amend
                </Button>
              )}
            </div>
            {post.body && (
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {post.body}
              </p>
            )}
          </div>
        )}

        {!isEditing && !hasPost && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm italic text-muted-foreground">
              No collective word inscribed yet.
            </p>
            {isMember && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={startEdit}
                className="font-display tracking-widest"
              >
                Inscribe today&apos;s post
              </Button>
            )}
          </div>
        )}

        {isEditing && isMember && (
          <div className="mt-3 flex flex-col gap-3">
            <Textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              placeholder="A few words for the pantheon — what stood today, what stumbled, what was won…"
              maxLength={1500}
              className="min-h-[6rem]"
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
              {hasPost && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelEdit}
                  disabled={isSaving}
                  className="font-display tracking-widest"
                >
                  Cancel
                </Button>
              )}
              {hasPost && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  disabled={isSaving}
                  className="font-display tracking-widest text-fallen hover:text-fallen"
                >
                  Clear
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={save}
                disabled={isSaving}
                className="gilded font-display tracking-widest"
              >
                {isSaving ? "Inscribing…" : "Inscribe"}
              </Button>
            </div>
          </div>
        )}

        {isEditing && !isMember && (
          <p className="mt-2 text-sm italic text-muted-foreground">
            Take the vow to inscribe a recap.
          </p>
        )}
      </div>

      {/* Per-member proof gallery */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
            Proofs of the day
          </p>
          {flatProofs.length > 0 && (
            <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
              {optimisticTotalVotes} vote
              {optimisticTotalVotes === 1 ? "" : "s"} cast
            </p>
          )}
        </div>
        {membersWithPhotos.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            No proofs inscribed yet today.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {membersWithPhotos.map((m) => (
              <li
                key={m.userId}
                className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-background/30 p-3"
              >
                <UserAvatar
                  name={m.displayName}
                  src={m.avatarUrl}
                  size={36}
                  customization={m.customization}
                />
                <p className="font-display text-sm tracking-tight">
                  {m.displayName}
                </p>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {m.photos.map((p) => {
                    const kind = classifyProofUrl(p.url);
                    const isImage = kind === "image";
                    return (
                      <div
                        key={p.checkinId}
                        title={p.activityLabel}
                        className="flex flex-col items-center gap-1"
                      >
                        <ProofMediaThumb
                          url={p.url}
                          size={64}
                          onOpen={isImage ? () => openLightbox(p.checkinId) : undefined}
                        />
                        {isImage && (
                          <button
                            type="button"
                            onClick={() => vote(p.checkinId)}
                            disabled={!isMember}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] uppercase tracking-widest transition",
                              p.hasMyVote
                                ? "border-gold bg-gold/15 text-gold"
                                : "border-border/60 text-muted-foreground hover:border-gold/60 hover:text-gold",
                              !isMember && "cursor-not-allowed opacity-60",
                            )}
                            aria-label={p.hasMyVote ? "Remove honor" : "Honor proof"}
                          >
                            <Heart
                              className={cn(
                                "h-3 w-3",
                                p.hasMyVote && "fill-current",
                              )}
                            />
                            {p.voteCount}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
        {otherMembers.length > 0 && (
          <p className="text-xs italic text-muted-foreground">
            Awaiting:{" "}
            <span
              className={cn(
                "font-display not-italic tracking-wide",
                "text-muted-foreground",
              )}
            >
              {otherMembers.map((m) => m.displayName).join(", ")}
            </span>
          </p>
        )}
      </div>

      {/* Lightbox */}
      <Dialog
        open={lightboxOpen}
        onOpenChange={(open) => {
          if (!open) setLightboxIndex(null);
        }}
      >
        <DialogContent
          className="max-w-3xl gap-3 bg-background/95 p-4 sm:max-w-3xl"
          showCloseButton
        >
          <DialogTitle className="sr-only">
            {activeProof
              ? `${activeProof.member.displayName} — ${activeProof.activityLabel}`
              : "Proof"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Proof of the day — vote or step through with arrow keys.
          </DialogDescription>
          {activeProof && (
            <div className="flex flex-col gap-3">
              <div className="relative aspect-square w-full overflow-hidden rounded-md bg-black/40 sm:aspect-[4/3]">
                <Image
                  src={activeProof.url}
                  alt={`${activeProof.member.displayName} — ${activeProof.activityLabel}`}
                  fill
                  sizes="(min-width: 768px) 720px, 100vw"
                  className="object-contain"
                  unoptimized
                />
                {flatProofs.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-border/60 bg-background/80 p-1.5 transition hover:bg-background"
                      aria-label="Previous proof"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => step(1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-border/60 bg-background/80 p-1.5 transition hover:bg-background"
                      aria-label="Next proof"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <UserAvatar
                  name={activeProof.member.displayName}
                  src={activeProof.member.avatarUrl}
                  size={32}
                  customization={activeProof.member.customization}
                />
                <div className="flex flex-col">
                  <p className="font-display text-sm tracking-tight">
                    {activeProof.member.displayName}
                  </p>
                  <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                    {activeProof.activityLabel}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {flatProofs.length > 1 && lightboxIndex !== null && (
                    <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                      {lightboxIndex + 1} / {flatProofs.length}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant={activeProof.hasMyVote ? "default" : "outline"}
                    size="sm"
                    onClick={() => vote(activeProof.checkinId)}
                    disabled={!isMember}
                    className={cn(
                      "font-display tracking-widest",
                      activeProof.hasMyVote && "gilded",
                    )}
                  >
                    <Heart
                      className={cn(
                        "mr-2 h-3 w-3",
                        activeProof.hasMyVote && "fill-current",
                      )}
                    />
                    {activeProof.hasMyVote ? "Honored" : "Honor"}
                    <span className="ml-2 opacity-70">
                      {activeProof.voteCount}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
