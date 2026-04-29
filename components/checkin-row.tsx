"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon } from "lucide-react";
import {
  toggleCheckinAction,
  uploadProofAction,
} from "@/app/(app)/check-in/actions";

interface CheckinRowProps {
  activityId: string;
  label: string;
  description: string;
  groupName: string;
  date: string;
  initialCompleted: boolean;
  initialPhotoUrl: string | null;
}

export function CheckinRow({
  activityId,
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

  function toggle(next: boolean) {
    setCompleted(next);
    startTransition(async () => {
      try {
        await toggleCheckinAction({
          activityId,
          date,
          completed: next,
        });
      } catch (err) {
        setCompleted(!next);
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
      toast.success("Proof inscribed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border/60 bg-background/40 p-4 md:flex-row md:items-start md:justify-between">
      <label className="flex flex-1 items-start gap-3">
        <Checkbox
          checked={completed}
          disabled={isPending}
          onCheckedChange={(v) => toggle(v === true)}
          className="mt-1 h-5 w-5"
        />
        <div className="flex flex-col gap-1">
          <p className="font-display text-lg leading-tight">{label}</p>
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
