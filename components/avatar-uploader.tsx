"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import type { FaceCustomization } from "@/lib/face-config";
import {
  removeAvatarAction,
  uploadAvatarAction,
} from "@/app/(app)/profile/actions";
import { AVATAR_ACCEPT, MAX_AVATAR_BYTES } from "@/lib/proof-media";

interface AvatarUploaderProps {
  name: string;
  initialAvatarUrl: string | null;
  customization?: Partial<FaceCustomization>;
}

export function AvatarUploader({
  name,
  initialAvatarUrl,
  customization,
}: AvatarUploaderProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [isUploading, setUploading] = useState(false);
  const [isRemoving, startRemove] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be 10 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const result = await uploadAvatarAction(fd);
      setAvatarUrl(result.url);
      toast.success("Visage anointed.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onRemove() {
    startRemove(async () => {
      try {
        await removeAvatarAction();
        setAvatarUrl(null);
        toast.success("Visage returned to the divine default.");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not remove";
        toast.error(msg);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <UserAvatar
        name={name}
        src={avatarUrl}
        size={96}
        customization={customization}
      />
      <div className="flex flex-col gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={AVATAR_ACCEPT}
          className="hidden"
          onChange={onFile}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={isUploading || isRemoving}
            onClick={() => fileRef.current?.click()}
            className="gilded font-display tracking-widest"
          >
            <Camera className="mr-2 h-4 w-4" />
            {isUploading
              ? "Anointing…"
              : avatarUrl
                ? "Replace"
                : "Upload"}
          </Button>
          {avatarUrl && (
            <Button
              type="button"
              variant="outline"
              disabled={isUploading || isRemoving}
              onClick={onRemove}
              className="font-display tracking-widest"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isRemoving ? "Removing…" : "Use default"}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          PNG, JPG, WEBP, GIF, or HEIC — 10 MB max. Default is a generated face
          from thy name.
        </p>
      </div>
    </div>
  );
}
