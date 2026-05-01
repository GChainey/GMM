"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Image as ImageIcon } from "lucide-react";
import {
  setAmountAction,
  toggleCheckinAction,
  uploadProofAction,
} from "@/app/(app)/check-in/actions";
import { useDayCelebration } from "@/components/day-celebration";
import { useSounds } from "@/hooks/use-sounds";
import { cn } from "@/lib/utils";

type Kind = "do" | "abstain" | "weekly_tally" | "monthly_total";

interface CheckinRowProps {
  activityId: string;
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
    if (file.size > 8 * 1024 * 1024) {
      toast.error("That image is over 8 MB. Try a smaller one.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("activityId", activityId);
      fd.set("date", date);
      fd.set("file", file);
      const result = await uploadProofAction(fd);
      setPhotoUrl(result.url);
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

  const tone =
    kind === "abstain"
      ? "border-fallen/40 bg-fallen/5"
      : "border-divine/30 bg-divine/5";
  const checkLabel = kind === "abstain" ? "Refrained today" : "Done today";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-start md:justify-between",
        tone,
      )}
    >
      <label className="flex flex-1 items-start gap-3">
        <Checkbox
          checked={completed}
          disabled={isPending}
          onCheckedChange={(v) => toggle(v === true)}
          className="mt-1 h-5 w-5"
          aria-label={checkLabel}
        />
        <div className="flex flex-col gap-1">
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
      </label>
      <div className="flex items-center gap-2">
        {photoUrl && (
          <a
            href={photoUrl}
            target="_blank"
            rel="noreferrer"
            className="group relative h-12 w-12 overflow-hidden rounded-md border border-gold/40"
          >
            <Image
              src={photoUrl}
              alt="proof"
              fill
              sizes="48px"
              className="object-cover"
              unoptimized
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
              <ImageIcon className="h-4 w-4 text-white opacity-0 transition group-hover:opacity-100" />
            </span>
          </a>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
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
    if (file.size > 8 * 1024 * 1024) {
      toast.error("That image is over 8 MB. Try a smaller one.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("activityId", activityId);
      fd.set("date", date);
      fd.set("file", file);
      const result = await uploadProofAction(fd);
      setPhotoUrl(result.url);
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

      <label className="flex flex-1 items-start gap-3">
        <Checkbox
          checked={completed}
          disabled={isPending}
          onCheckedChange={(v) => toggle(v === true)}
          className="mt-1 h-5 w-5"
          aria-label={`Did this today — ${label}`}
        />
        <div className="flex flex-col gap-1">
          <p className="font-display text-sm tracking-tight">
            {completed ? "Logged today" : "Mark today"}
          </p>
          <p className="text-xs text-muted-foreground">
            Each day thou performest the rite, mark it. The week&apos;s tally
            climbs by one.
          </p>
        </div>
      </label>

      <div className="flex items-center gap-2">
        {photoUrl && (
          <a
            href={photoUrl}
            target="_blank"
            rel="noreferrer"
            className="relative h-10 w-10 overflow-hidden rounded-md border border-gold/40"
          >
            <Image
              src={photoUrl}
              alt="proof"
              fill
              sizes="40px"
              className="object-cover"
              unoptimized
            />
          </a>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
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
    if (file.size > 8 * 1024 * 1024) {
      toast.error("That image is over 8 MB. Try a smaller one.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("activityId", activityId);
      fd.set("date", date);
      fd.set("file", file);
      const result = await uploadProofAction(fd);
      setPhotoUrl(result.url);
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
          {photoUrl && (
            <a
              href={photoUrl}
              target="_blank"
              rel="noreferrer"
              className="relative h-10 w-10 overflow-hidden rounded-md border border-gold/40"
            >
              <Image
                src={photoUrl}
                alt="proof"
                fill
                sizes="40px"
                className="object-cover"
                unoptimized
              />
            </a>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
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
