"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { groupMemberships, groups } from "@/db/schema";
import { ensureUserRow, requireUserId } from "@/lib/auth";
import { createInviteToken } from "@/lib/id";
import { slugify } from "@/lib/slug";

const createGroupSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).default(""),
  isPublic: z.boolean(),
  strikeLimit: z.number().int().min(0).max(31),
  rewardText: z.string().max(500).default(""),
  punishmentText: z.string().max(500).default(""),
});

async function uniqueSlug(base: string): Promise<string> {
  const slug = slugify(base);
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const existing = await db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
    attempt += 1;
    if (attempt > 50) throw new Error("Could not generate unique slug");
  }
}

export async function createGroupAction(formData: FormData) {
  const userId = await requireUserId();
  await ensureUserRow();

  const parsed = createGroupSchema.parse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    isPublic: formData.get("isPublic") === "on",
    strikeLimit: Number(formData.get("strikeLimit") ?? 0),
    rewardText: String(formData.get("rewardText") ?? ""),
    punishmentText: String(formData.get("punishmentText") ?? ""),
  });

  const slug = await uniqueSlug(parsed.name);
  const inviteToken = createInviteToken();

  const [created] = await db
    .insert(groups)
    .values({
      slug,
      name: parsed.name,
      description: parsed.description,
      isPublic: parsed.isPublic,
      strikeLimit: parsed.strikeLimit,
      inviteToken,
      ownerId: userId,
    })
    .returning();

  await db.insert(groupMemberships).values({
    groupId: created.id,
    userId,
    role: "owner",
  });

  revalidatePath("/groups");
  redirect(`/groups/${created.slug}/pledge/new?reward=${encodeURIComponent(
    parsed.rewardText,
  )}&punishment=${encodeURIComponent(parsed.punishmentText)}`);
}

export async function joinGroupAction(formData: FormData) {
  const userId = await requireUserId();
  await ensureUserRow();
  const slug = String(formData.get("slug") ?? "");
  const token = String(formData.get("token") ?? "");

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);
  if (!group) throw new Error("Pantheon not found");

  if (!group.isPublic && group.inviteToken !== token) {
    throw new Error("This pantheon is sealed. A valid token is required.");
  }

  const existing = await db
    .select()
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, group.id),
        eq(groupMemberships.userId, userId),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    await db.insert(groupMemberships).values({
      groupId: group.id,
      userId,
      role: "member",
    });
  }

  revalidatePath(`/groups/${slug}`);
  redirect(`/groups/${slug}/pledge/new`);
}

const settingsSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).default(""),
  isPublic: z.boolean(),
  strikeLimit: z.number().int().min(0).max(31),
});

export async function updateGroupSettingsAction(formData: FormData) {
  const userId = await requireUserId();
  const slug = String(formData.get("slug") ?? "");

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);
  if (!group) throw new Error("Pantheon not found");
  if (group.ownerId !== userId) throw new Error("Only the founder may amend the rite");

  const parsed = settingsSchema.parse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    isPublic: formData.get("isPublic") === "on",
    strikeLimit: Number(formData.get("strikeLimit") ?? 0),
  });

  await db
    .update(groups)
    .set({
      name: parsed.name,
      description: parsed.description,
      isPublic: parsed.isPublic,
      strikeLimit: parsed.strikeLimit,
    })
    .where(eq(groups.id, group.id));

  revalidatePath(`/groups/${slug}`);
  revalidatePath(`/groups/${slug}/settings`);
  redirect(`/groups/${slug}`);
}
