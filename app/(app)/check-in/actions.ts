"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { put } from "@vercel/blob";
import { db } from "@/db";
import {
  activities,
  dailyCheckins,
  journalEntries,
  pledges,
} from "@/db/schema";
import { ensureUserRow, requireUserId } from "@/lib/auth";
import { hasChallengeStarted, isChallengeDate, todayIsoInTz } from "@/lib/dates";

const toggleSchema = z.object({
  activityId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completed: z.boolean(),
});

const amountSchema = z.object({
  activityId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().int().min(0).max(100000),
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

export async function setAmountAction(input: {
  activityId: string;
  date: string;
  amount: number;
}) {
  const userId = await requireUserId();
  await ensureUserRow();
  const data = amountSchema.parse(input);

  if (!hasChallengeStarted("UTC")) {
    throw new Error("The ritual has not begun. Tallies open May 1st.");
  }
  if (!isChallengeDate(data.date)) {
    throw new Error("Only May dates may be tallied.");
  }
  const today = todayIsoInTz("UTC");
  if (data.date > today) {
    throw new Error("The future cannot be tallied.");
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
      completed: data.amount > 0,
      amount: data.amount,
    });
  } else {
    await db
      .update(dailyCheckins)
      .set({
        amount: data.amount,
        completed: data.amount > 0,
        updatedAt: new Date(),
      })
      .where(eq(dailyCheckins.id, existing[0].id));
  }

  revalidatePath("/check-in");
  revalidatePath("/dashboard");
}

const journalSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  body: z.string().max(4000),
});

export async function saveJournalAction(input: {
  date: string;
  body: string;
}) {
  const userId = await requireUserId();
  await ensureUserRow();
  const data = journalSchema.parse(input);

  if (!isChallengeDate(data.date)) {
    throw new Error("Journals are only kept for May.");
  }
  const today = todayIsoInTz("UTC");
  if (data.date > today) {
    throw new Error("The future cannot be inscribed.");
  }

  const trimmed = data.body.trim();
  const existing = await db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        eq(journalEntries.date, data.date),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    if (trimmed.length === 0) return;
    await db.insert(journalEntries).values({
      userId,
      date: data.date,
      body: trimmed,
    });
  } else if (trimmed.length === 0) {
    await db
      .delete(journalEntries)
      .where(eq(journalEntries.id, existing[0].id));
  } else {
    await db
      .update(journalEntries)
      .set({ body: trimmed, updatedAt: new Date() })
      .where(eq(journalEntries.id, existing[0].id));
  }

  revalidatePath("/check-in");
}
