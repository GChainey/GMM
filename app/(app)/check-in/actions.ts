"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { activities, dailyCheckins, pledges } from "@/db/schema";
import { ensureUserRow, requireUserId } from "@/lib/auth";
import { hasChallengeStarted, isChallengeDate, todayIsoInTz } from "@/lib/dates";

const toggleSchema = z.object({
  activityId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completed: z.boolean(),
});

async function ensureOwnership(activityId: string, userId: string) {
  const [row] = await db
    .select({ pledgeUserId: pledges.userId })
    .from(activities)
    .innerJoin(pledges, eq(pledges.id, activities.pledgeId))
    .where(eq(activities.id, activityId))
    .limit(1);
  if (!row || row.pledgeUserId !== userId) {
    throw new Error("This rite is not thine to mark.");
  }
}

export async function toggleCheckinAction(input: {
  activityId: string;
  date: string;
  completed: boolean;
}) {
  const userId = await requireUserId();
  await ensureUserRow();
  const data = toggleSchema.parse(input);

  if (!hasChallengeStarted("UTC")) {
    throw new Error("The ritual has not begun. Daily rites unlock May 1st.");
  }
  if (!isChallengeDate(data.date)) {
    throw new Error("Only May dates may be marked.");
  }
  const today = todayIsoInTz("UTC");
  if (data.date > today) {
    throw new Error("The future cannot be marked.");
  }

  await ensureOwnership(data.activityId, userId);

  const existing = await db
    .select()
    .from(dailyCheckins)
    .where(
      and(
        eq(dailyCheckins.userId, userId),
        eq(dailyCheckins.activityId, data.activityId),
        eq(dailyCheckins.date, data.date),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    await db.insert(dailyCheckins).values({
      userId,
      activityId: data.activityId,
      date: data.date,
      completed: data.completed,
    });
  } else {
    await db
      .update(dailyCheckins)
      .set({
        completed: data.completed,
        updatedAt: new Date(),
      })
      .where(eq(dailyCheckins.id, existing[0].id));
  }

  revalidatePath("/check-in");
  revalidatePath("/dashboard");
  // Pantheon pages also benefit; let Next.js revalidate when visited.
}

export async function uploadProofAction(formData: FormData) {
  const userId = await requireUserId();
  await ensureUserRow();

  const activityId = String(formData.get("activityId") ?? "");
  const date = String(formData.get("date") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No file provided");
  }
  toggleSchema.parse({ activityId, date, completed: true });
  await ensureOwnership(activityId, userId);

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "Photo uploads are not configured. Set BLOB_READ_WRITE_TOKEN to enable proof of rite.",
    );
  }

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const key = `proofs/${userId}/${activityId}/${date}-${Date.now()}.${ext}`;
  const blob = await put(key, file, {
    access: "public",
    contentType: file.type || "image/jpeg",
  });

  const existing = await db
    .select()
    .from(dailyCheckins)
    .where(
      and(
        eq(dailyCheckins.userId, userId),
        eq(dailyCheckins.activityId, activityId),
        eq(dailyCheckins.date, date),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    await db.insert(dailyCheckins).values({
      userId,
      activityId,
      date,
      completed: true,
      photoUrl: blob.url,
    });
  } else {
    await db
      .update(dailyCheckins)
      .set({
        completed: true,
        photoUrl: blob.url,
        updatedAt: new Date(),
      })
      .where(eq(dailyCheckins.id, existing[0].id));
  }

  revalidatePath("/check-in");
  revalidatePath("/dashboard");
  return { url: blob.url };
}
