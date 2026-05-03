"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { Camera, FileVideo, Music, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { saveCollectivePostAction } from "@/app/(app)/groups/[slug]/recap-actions";
import {
  MAX_PROOF_BYTES,
  PROOF_ACCEPT,
  classifyProofUrl,
  isAcceptedProofType,
} from "@/lib/proof-media";
import type { FaceCustomization } from "@/lib/face-config";
import { cn } from "@/lib/utils";

interface MemberPhoto {
  url: string;
  activityLabel: string;
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
  photoUrl: string | null;
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

const MULTIPART_THRESHOLD = 5 * 1024 * 1024;

async function uploadCollectivePostMedia(
  groupId: string,
  date: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
  const pathname = `collective/${groupId}/${date}-${Date.now()}.${ext}`;
  const blob = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/upload/collective-post",
    contentType: file.type || undefined,
    multipart: file.size > MULTIPART_THRESHOLD,
    clientPayload: JSON.stringify({ groupId, date }),
  });
  return blob.url;
}

function MediaThumb({ url, size }: { url: string; size: number }) {
  const kind = classifyProofUrl(url);
  if (kind === "image") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
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
      </a>
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
  const hasPost =
    post.body.trim().length > 0 || Boolean(post.photoUrl) || Boolean(post.author);
  const [isEditing, setEditing] = useState(!hasPost && isMember);
  const [draftBody, setDraftBody] = useState(post.body);
  const [draftPhotoUrl, setDraftPhotoUrl] = useState<string | null>(
    post.photoUrl,
  );
  const [isUploading, setUploading] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const membersWithPhotos = members.filter((m) => m.photos.length > 0);
  const otherMembers = members.filter((m) => m.photos.length === 0);

  function startEdit() {
    setDraftBody(post.body);
    setDraftPhotoUrl(post.photoUrl);
    setEditing(true);
  }

  function cancelEdit() {
    if (!hasPost) return;
    setDraftBody(post.body);
    setDraftPhotoUrl(post.photoUrl);
    setEditing(false);
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PROOF_BYTES) {
      toast.error("That offering is over 50 MB. Try a smaller one.");
      return;
    }
    if (!isAcceptedProofType(file)) {
      toast.error("Only images, video, or audio may grace the recap.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadCollectivePostMedia(groupId, date, file);
      setDraftPhotoUrl(url);
      toast.success("Relic attached");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function save() {
    const trimmed = draftBody.trim();
    if (trimmed.length === 0 && !draftPhotoUrl) {
      toast.error("A recap needs words or a relic.");
      return;
    }
    startSaving(async () => {
      try {
        await saveCollectivePostAction({
          groupId,
          date,
          body: trimmed,
          photoUrl: draftPhotoUrl,
        });
        setPost((prev) => ({
          body: trimmed,
          photoUrl: draftPhotoUrl,
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
    setDraftPhotoUrl(null);
    startSaving(async () => {
      try {
        await saveCollectivePostAction({
          groupId,
          date,
          body: "",
          photoUrl: null,
        });
        setPost({
          body: "",
          photoUrl: null,
          author: null,
          updatedAt: null,
        });
        toast.success("Recap cleared");
        setEditing(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not save";
        toast.error(msg);
      }
    });
  }

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

      {/* Collective post */}
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
            {post.photoUrl && (
              <div className="self-start">
                <MediaThumb url={post.photoUrl} size={220} />
              </div>
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
            <div className="flex flex-wrap items-center gap-2">
              {draftPhotoUrl && (
                <div className="relative">
                  <MediaThumb url={draftPhotoUrl} size={64} />
                  <button
                    type="button"
                    onClick={() => setDraftPhotoUrl(null)}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-xs text-muted-foreground hover:text-foreground"
                    aria-label="Remove relic"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={PROOF_ACCEPT}
                className="hidden"
                onChange={onPickFile}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => fileRef.current?.click()}
                className="font-display tracking-widest"
              >
                <Camera className="mr-2 h-4 w-4" />
                {isUploading
                  ? "Inscribing…"
                  : draftPhotoUrl
                    ? "Replace relic"
                    : "Attach relic"}
              </Button>
              <div className="ml-auto flex flex-wrap items-center gap-2">
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
                  disabled={isSaving || isUploading}
                  className="gilded font-display tracking-widest"
                >
                  {isSaving ? "Inscribing…" : "Inscribe"}
                </Button>
              </div>
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
        <p className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
          Proofs of the day
        </p>
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
                  {m.photos.map((p, idx) => (
                    <div
                      key={`${p.url}-${idx}`}
                      title={p.activityLabel}
                      className="flex flex-col items-center gap-1"
                    >
                      <MediaThumb url={p.url} size={64} />
                    </div>
                  ))}
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
    </section>
  );
}
