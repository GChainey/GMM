"use client";

import {
  Avatar as FaceAvatar,
  AvatarImage as FaceAvatarImage,
  AvatarFallback as FaceAvatarFallback,
} from "facehash";

import { cn } from "@/lib/utils";
import { FaceDisplay } from "@/components/face-display";
import {
  resolveFace,
  type FaceCustomization,
} from "@/lib/face-config";

interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  ringClassName?: string;
  customization?: Partial<FaceCustomization>;
}

export function UserAvatar({
  name,
  src,
  size = 40,
  className,
  ringClassName = "ring-2 ring-gold/40",
  customization,
}: UserAvatarProps) {
  const safeName = name || "?";
  const face = resolveFace(safeName, {
    faceStyle: customization?.faceStyle ?? null,
    faceColor: customization?.faceColor ?? null,
    faceGaze: customization?.faceGaze ?? null,
    faceDepth: customization?.faceDepth ?? null,
  });
  const initial = safeName.charAt(0).toUpperCase();

  return (
    <FaceAvatar
      className={cn(
        "relative shrink-0 rounded-full",
        ringClassName,
        className,
      )}
      style={{ width: size, height: size }}
    >
      <FaceAvatarImage src={src ?? undefined} alt={safeName} />
      <FaceAvatarFallback name={safeName}>
        <FaceDisplay
          face={face}
          initial={initial}
          enableBlink
          className="h-full w-full rounded-full"
        />
      </FaceAvatarFallback>
    </FaceAvatar>
  );
}
