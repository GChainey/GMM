export const MAX_PROOF_BYTES = 50 * 1024 * 1024;
export const MAX_AVATAR_BYTES = 10 * 1024 * 1024;

export const PROOF_ACCEPT =
  "image/*,video/*,audio/*,.heic,.heif,.mov,.m4a,.m4v,.aac,.opus,.flac,.wav,.mp3,.mp4,.webm,.ogg";

export const AVATAR_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif,.heic,.heif";

const RENDERABLE_IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i;
const AUDIO_EXT = /\.(mp3|m4a|aac|opus|flac|wav)(\?|$)/i;

export type ProofMediaKind = "image" | "video" | "audio" | "other";

export function classifyProofUrl(url: string): ProofMediaKind {
  if (RENDERABLE_IMAGE_EXT.test(url)) return "image";
  if (VIDEO_EXT.test(url)) return "video";
  if (AUDIO_EXT.test(url)) return "audio";
  return "other";
}

export function isAcceptedProofType(file: File): boolean {
  if (file.type) {
    if (
      file.type.startsWith("image/") ||
      file.type.startsWith("video/") ||
      file.type.startsWith("audio/")
    ) {
      return true;
    }
  }
  // Some browsers report empty type for HEIC; fall back to extension.
  return /\.(heic|heif|mov|m4a|m4v|aac|opus|flac|wav|mp3|mp4|webm|ogg|jpe?g|png|gif|webp|avif)$/i.test(
    file.name,
  );
}

export function isAcceptedAvatarType(file: File): boolean {
  if (file.type) {
    if (
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "image/webp" ||
      file.type === "image/gif" ||
      file.type === "image/heic" ||
      file.type === "image/heif"
    ) {
      return true;
    }
  }
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
}

export function formatMaxSizeMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
