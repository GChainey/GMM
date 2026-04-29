"use client";

import {
  Avatar as FaceAvatar,
  AvatarImage as FaceAvatarImage,
  AvatarFallback as FaceAvatarFallback,
} from "facehash";

import { cn } from "@/lib/utils";

const FACEHASH_COLOR_CLASSES = [
  "bg-amber-500 dark:bg-amber-600",
  "bg-rose-500 dark:bg-rose-600",
  "bg-violet-500 dark:bg-violet-600",
  "bg-sky-500 dark:bg-sky-600",
  "bg-emerald-500 dark:bg-emerald-600",
  "bg-fuchsia-500 dark:bg-fuchsia-600",
];

interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  ringClassName?: string;
}

export function UserAvatar({
  name,
  src,
  size = 40,
  className,
  ringClassName = "ring-2 ring-gold/40",
}: UserAvatarProps) {
  return (
    <FaceAvatar
      className={cn(
        "relative shrink-0 rounded-full",
        ringClassName,
        className,
      )}
      style={{ width: size, height: size }}
    >
      <FaceAvatarImage src={src ?? undefined} alt={name} />
      <FaceAvatarFallback
        name={name || "?"}
        facehashProps={{
          colorClasses: FACEHASH_COLOR_CLASSES,
          intensity3d: "subtle",
          enableBlink: true,
        }}
      />
    </FaceAvatar>
  );
}
