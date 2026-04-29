"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureUserRow, requireUserId } from "@/lib/auth";
import {
  FACE_COLOR_COUNT,
  FACE_DEPTH_COUNT,
  FACE_GAZE_COUNT,
  FACE_STYLE_COUNT,
} from "@/lib/face-config";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function uploadAvatarAction(formData: FormData) {
  const userId = await requireUserId();
  await ensureUserRow();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No image provided.");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    throw new Error("Use a JPG, PNG, WEBP, or GIF.");
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "Avatar uploads are not configured. Set BLOB_READ_WRITE_TOKEN to enable.",
    );
  }

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const key = `avatars/${userId}/${Date.now()}.${ext}`;
  const blob = await put(key, file, {
    access: "public",
    contentType: file.type || "image/jpeg",
  });

  await db
    .update(users)
    .set({ avatarUrl: blob.url })
    .where(eq(users.id, userId));

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { url: blob.url };
}

export async function removeAvatarAction() {
  const userId = await requireUserId();
  await ensureUserRow();

  await db
    .update(users)
    .set({ avatarUrl: null })
    .where(eq(users.id, userId));

  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

interface FaceCustomizationInput {
  faceStyle: number | null;
  faceColor: number | null;
  faceGaze: number | null;
  faceDepth: number | null;
}

export async function updateFaceCustomizationAction(
  input: FaceCustomizationInput,
) {
  const userId = await requireUserId();
  await ensureUserRow();

  const faceStyle = boundedIndex(input.faceStyle, FACE_STYLE_COUNT);
  const faceColor = boundedIndex(input.faceColor, FACE_COLOR_COUNT);
  const faceGaze = boundedIndex(input.faceGaze, FACE_GAZE_COUNT);
  const faceDepth = boundedIndex(input.faceDepth, FACE_DEPTH_COUNT);

  await db
    .update(users)
    .set({ faceStyle, faceColor, faceGaze, faceDepth })
    .where(eq(users.id, userId));

  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

export async function resetFaceCustomizationAction() {
  const userId = await requireUserId();
  await ensureUserRow();

  await db
    .update(users)
    .set({ faceStyle: null, faceColor: null, faceGaze: null, faceDepth: null })
    .where(eq(users.id, userId));

  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

function boundedIndex(value: number | null, length: number) {
  if (value == null) return null;
  if (!Number.isInteger(value)) return null;
  if (value < 0 || value >= length) return null;
  return value;
}
