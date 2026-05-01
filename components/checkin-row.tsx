"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Camera,
  Check,
  FileVideo,
  Music,
  Image as ImageIcon,
} from "lucide-react";
import {
  recordProofUploadAction,
  setAmountAction,
  toggleCheckinAction,
} from "@/app/(app)/check-in/actions";
import { useDayCelebration } from "@/components/day-celebration";
import { useSounds } from "@/hooks/use-sounds";
import { cn } from "@/lib/utils";
import {
  MAX_PROOF_BYTES,
  PROOF_ACCEPT,
  classifyProofUrl,
  isAcceptedProofType,
} from "@/lib/proof-media";

const PROOF_OVERSIZE_MESSAGE = "That offering is over 50 MB. Try a smaller one.";

const MULTIPART_THRESHOLD = 5 * 1024 * 1024;

async function uploadProof(
  userId: string,
  activityId: string,
  date: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
  const pathname = `proofs/${userId}/${activityId}/${date}-${Date.now()}.${ext}`;
  const blob = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/upload/proof",
    contentType: file.type || undefined,
    multipart: file.size > MULTIPART_THRESHOLD,
    clientPayload: JSON.stringify({ activityId, date }),
  });
  await recordProofUploadAction({ activityId, date, url: blob.url });
  return blob.url;
}

function ProofThumbnail({
  url,
  size,
}: {
  url: string;
  size: "sm" | "md";
}) {
  const kind = classifyProofUrl(url);
  const dim = size === "md" ? "h-12 w-12" : "h-10 w-10";
  const pixels = size === "md" ? 48 : 40;
  if (kind === "image") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "group relative overflow-hidden rounded-md border border-gold/40",
          dim,
        )}
      >
        <Image
          src={url}
          alt="proof"
          fill
          sizes={`${pixels}px`}
          className="object-cover"
          unoptimized
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
          <ImageIcon className="h-4 w-4 text-white opacity-0 transition group-hover:opacity-100" />
        </span>
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
      className={cn(
        "flex items-center justify-center rounded-md border border-gold/40 bg-gold/10 text-gold/80 transition hover:bg-gold/20",
        dim,
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="sr-only">Open {label.toLowerCase()} proof</span>
    </a>
  );
}

type Kind = "do" | "abstain" | "weekly_tally" | "monthly_total";

interface CheckinRowProps {
  activityId: string;
  userId: string;
  kind: Kind;
  label: string;
  description: string;
  groupName: string;
  date: string;
  initialCompleted: boolean;
  initialAmount: number | null;
  initialPhotoUrl: string | null;
  // Only meaningful for monthly_total
  unit?: string | null;
  target?: number | null;
  monthTotalSoFar?: number;
  // Only meaningful for weekly_tally
  weekDoneSoFar?: number;
  weekTarget?: number | null;
  weekStartIso?: string;
  weekEndIso?: string;
}

export function CheckinRow(props: CheckinRowProps) {
  if (props.kind === "monthly_total") {
    return <MonthlyTallyRow {...props} />;
  }
  if (props.kind === "weekly_tally") {
    return <WeeklyTallyRow {...props} />;
  }
  return <DailyToggleRow {...props} />;
}

function DailyToggleRow({
  activityId,
  userId,
  kind,
  label,
  description,
  groupName,
  date,
  initialCompleted,
  initialPhotoUrl,
}: CheckinRowProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const playSound = useSounds();
  const dayCelebration = useDayCelebration();

  function toggle(next: boolean) {
    setCompleted(next);
    dayCelebration?.setCompletion(activityId, next);
    startTransition(async () => {
      try {
        await toggleCheckinAction({ activityId, date, completed: next });
        playSound(next ? "riteChecked" : "riteUnchecked");
      } catch (err) {
        setCompleted(!next);
        dayCelebration?.setCompletion(activityId, !next);
        const msg = err instanceof Error ? err.message : "Could not save";
        toast.error(msg);
      }
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PROOF_BYTES) {
      toast.error(PROOF_OVERSIZE_MESSAGE);
      return;
    }
    if (!isAcceptedProofType(file)) {
      toast.error("Only images, video, or audio may be inscribed as proof.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadProof(userId, activityId, date, file);
      setPhotoUrl(url);
      setCompleted(true);
      dayCelebration?.setCompletion(activityId, true);
      playSound("proofInscribed");
      toast.success("Proof inscribed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const tone = completed
    ? kind === "abstain"
      ? "border-fallen/60 bg-fallen/10"
      : "border-divine/60 bg-divine/10"
    : kind === "abstain"
      ? "border-fallen/40 bg-fallen/5"
      : "border-divine/30 bg-divine/5";
  const doneLabel = kind === "abstain" ? "Refrained" : "Done";
  const markLabel = kind === "abstain" ? "Mark refrained" : "Mark done";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-start md:justify-between",
        tone,
      )}
    >
      <div className="flex flex-1 flex-col gap-1">
        <p className="font-display text-lg leading-tight">{label}</p>
        <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
          {kind === "abstain" ? "Abstain" : "Do daily"}
        </p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {groupName}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={completed ? "default" : "outline"}
          disabled={isPending}
          onClick={() => toggle(!completed)}
          aria-pressed={completed}
          className={cn(
            "font-display tracking-widest",
            completed && "gilded",
          )}
        >
          {completed ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              {isPending ? "Saving…" : doneLabel}
            </>
          ) : (
            isPending ? "Saving…" : markLabel
          )}
        </Button>
        {photoUrl && <ProofThumbnail url={photoUrl} size="md" />}
        <input
          ref={fileRef}
          type="file"
          accept={PROOF_ACCEPT}
          className="hidden"
          onChange={onFile}
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
          {isUploading ? "Inscribing…" : photoUrl ? "Replace" : "Proof"}
        </Button>
      </div>
    </div>
  );
}

function WeeklyTallyRow({
  activityId,
  userId,
  label,
  description,
  groupName,
  date,
  initialCompleted,
  initialPhotoUrl,
  unit,
  weekDoneSoFar = 0,
  weekTarget,
  weekStartIso,
  weekEndIso,
}: CheckinRowProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const playSound = useSounds();
  const dayCelebration = useDayCelebration();

  const baseDone = Math.max(0, weekDoneSoFar - (initialCompleted ? 1 : 0));
  const previewDone = baseDone + (completed ? 1 : 0);
  const goal = weekTarget ?? 0;
  const ratio = goal > 0 ? Math.min(1, previewDone / goal) : 0;
  const unitLabel = unit ?? "";

  function toggle(next: boolean) {
    setCompleted(next);
    dayCelebration?.setCompletion(activityId, next);
    startTransition(async () => {
      try {
        await toggleCheckinAction({ activityId, date, completed: next });
        playSound(next ? "tallyInscribed" : "riteUnchecked");
      } catch (err) {
        setCompleted(!next);
        dayCelebration?.setCompletion(activityId, !next);
        const msg = err instanceof Error ? err.message : "Could not save";
        toast.error(msg);
      }
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PROOF_BYTES) {
      toast.error(PROOF_OVERSIZE_MESSAGE);
      return;
    }
    if (!isAcceptedProofType(file)) {
      toast.error("Only images, video, or audio may be inscribed as proof.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadProof(userId, activityId, date, file);
      setPhotoUrl(url);
      setCompleted(true);
      dayCelebration?.setCompletion(activityId, true);
      playSound("proofInscribed");
      toast.success("Proof inscribed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const weekRange =
    weekStartIso && weekEndIso ? `${weekStartIso} → ${weekEndIso}` : "this week";

  return (
    <div className="flex flex-col gap-3 rounded-md border border-gold/40 bg-gold/[0.04] p-4">
      <div className="flex flex-col gap-1">
        <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
          Weekly tally
        </p>
        <p className="font-display text-lg leading-tight">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {groupName}
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border/50 bg-background/40 p-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
              This week ({weekRange})
            </p>
            <p className="font-display text-2xl leading-none">
              {previewDone}
              {unitLabel && (
                <span className="ml-1 text-sm text-muted-foreground">
                  {unitLabel}
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
              Target
            </p>
            <p className="font-display text-lg">
              {goal}
              {unitLabel && (
                <span className="ml-1 text-sm text-muted-foreground">
                  {unitLabel}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full rounded-full bg-gold transition-[width]"
            style={{ width: `${(ratio * 100).toFixed(1)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <p className="text-xs text-muted-foreground sm:flex-1">
          Each day thou performest the rite, mark it. The week&apos;s tally
          climbs by one.
        </p>
        <Button
          type="button"
          size="sm"
          variant={completed ? "default" : "outline"}
          disabled={isPending}
          onClick={() => toggle(!completed)}
          aria-pressed={completed}
          className={cn(
            "font-display tracking-widest",
            completed && "gilded",
          )}
        >
          {completed ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              {isPending ? "Saving…" : "Logged today"}
            </>
          ) : (
            isPending ? "Saving…" : "Mark today"
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {photoUrl && <ProofThumbnail url={photoUrl} size="sm" />}
        <input
          ref={fileRef}
          type="file"
          accept={PROOF_ACCEPT}
          className="hidden"
          onChange={onFile}
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
          {isUploading ? "Inscribing…" : photoUrl ? "Replace" : "Proof"}
        </Button>
      </div>
    </div>
  );
}

function MonthlyTallyRow({
  activityId,
  userId,
  label,
  description,
  groupName,
  date,
  initialAmount,
  initialPhotoUrl,
  unit,
  target,
  monthTotalSoFar = 0,
}: CheckinRowProps) {
  const [todayAmount, setTodayAmount] = useState<string>(
    initialAmount != null ? String(initialAmount) : "",
  );
  const [savedAmount, setSavedAmount] = useState<number>(initialAmount ?? 0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl);
  const [isSaving, startSave] = useTransition();
  const [isUploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const playSound = useSounds();
  const dayCelebration = useDayCelebration();

  const totalSoFar = Math.max(0, monthTotalSoFar - savedAmount);
  const previewTotal = totalSoFar + (Number(todayAmount) || 0);
  const goal = target ?? 0;
  const ratio = goal > 0 ? Math.min(1, previewTotal / goal) : 0;

  function save() {
    const parsed = Number(todayAmount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Enter a non-negative number.");
      return;
    }
    const value = Math.round(parsed);
    startSave(async () => {
      try {
        await setAmountAction({ activityId, date, amount: value });
        setSavedAmount(value);
        dayCelebration?.setCompletion(activityId, value > 0);
        if (value > 0) playSound("tallyInscribed");
        toast.success(value === 0 ? "Tally cleared" : "Tally inscribed");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not save";
        toast.error(msg);
      }
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PROOF_BYTES) {
      toast.error(PROOF_OVERSIZE_MESSAGE);
      return;
    }
    if (!isAcceptedProofType(file)) {
      toast.error("Only images, video, or audio may be inscribed as proof.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadProof(userId, activityId, date, file);
      setPhotoUrl(url);
      playSound("proofInscribed");
      toast.success("Proof inscribed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const unitLabel = unit ?? "";

  return (
    <div className="flex flex-col gap-3 rounded-md border border-gold/40 bg-gold/5 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
          Monthly tally
        </p>
        <p className="font-display text-lg leading-tight">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {groupName}
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border/50 bg-background/40 p-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
              Total so far
            </p>
            <p className="font-display text-2xl leading-none">
              {previewTotal}
              {unitLabel && (
                <span className="ml-1 text-sm text-muted-foreground">
                  {unitLabel}
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
              Target
            </p>
            <p className="font-display text-lg">
              {goal}
              {unitLabel && (
                <span className="ml-1 text-sm text-muted-foreground">
                  {unitLabel}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full rounded-full bg-gold transition-[width]"
            style={{ width: `${(ratio * 100).toFixed(1)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={todayAmount}
            onChange={(e) => setTodayAmount(e.target.value)}
            placeholder={`Today's amount${unitLabel ? ` (${unitLabel})` : ""}`}
            className="max-w-[16rem]"
          />
          <Button
            type="button"
            disabled={isSaving}
            onClick={save}
            className="gilded font-display tracking-widest"
          >
            {isSaving ? "Inscribing…" : "Inscribe"}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {photoUrl && <ProofThumbnail url={photoUrl} size="sm" />}
          <input
            ref={fileRef}
            type="file"
            accept={PROOF_ACCEPT}
            className="hidden"
            onChange={onFile}
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
            {isUploading ? "…" : photoUrl ? "Replace" : "Proof"}
          </Button>
        </div>
      </div>
    </div>
  );
}
