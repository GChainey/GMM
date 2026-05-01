"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  CHARITY_SELECTIONS,
  groupMemberships,
  groups,
  pledgeOptions,
  PLEDGE_OPTION_INTENSITIES,
  PLEDGE_OPTION_TYPES,
} from "@/db/schema";
import { ensureUserRow, requireUserId } from "@/lib/auth";
import { createInviteToken } from "@/lib/id";
import { slugify } from "@/lib/slug";
import {
  PRESETS,
  PRESET_KEYS,
  seedSlugsToIds,
  DEFAULT_PRESET,
} from "@/lib/pledge-options";

const presetSchema = z.enum(PRESET_KEYS);

const charitySchema = z.object({
  charityModeEnabled: z.boolean(),
  charitySelection: z.enum(CHARITY_SELECTIONS),
  charityName: z.string().max(120).default(""),
  charityUrl: z.string().max(500).default(""),
});

function normalizeCharity(input: z.infer<typeof charitySchema>) {
  if (!input.charityModeEnabled) {
    return {
      charityModeEnabled: false,
      charitySelection: input.charitySelection,
      charityName: "",
      charityUrl: "",
    };
  }
  const trimmedName = input.charityName.trim();
  const trimmedUrl = input.charityUrl.trim();
  if (input.charitySelection === "admin" && trimmedName.length === 0) {
    throw new Error(
      "Name the cause — when the founder picks, all donations flow to a single charity.",
    );
  }
  if (trimmedUrl.length > 0 && !/^https?:\/\//i.test(trimmedUrl)) {
    throw new Error("The charity link must begin with http:// or https://.");
  }
  return {
    charityModeEnabled: true,
    charitySelection: input.charitySelection,
    charityName: input.charitySelection === "admin" ? trimmedName : "",
    charityUrl: input.charitySelection === "admin" ? trimmedUrl : "",
  };
}

function readCharityForm(formData: FormData) {
  return charitySchema.parse({
    charityModeEnabled: formData.get("charityModeEnabled") === "on",
    charitySelection: String(
      formData.get("charitySelection") ?? "individual",
    ),
    charityName: String(formData.get("charityName") ?? ""),
    charityUrl: String(formData.get("charityUrl") ?? ""),
  });
}

const createGroupSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).default(""),
  isPublic: z.boolean(),
  strikeLimit: z.number().int().min(0).max(31),
  preset: presetSchema.default(DEFAULT_PRESET),
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
    preset: String(formData.get("preset") ?? DEFAULT_PRESET),
  });

  const charity = normalizeCharity(readCharityForm(formData));
  const preset = PRESETS[parsed.preset];
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
      allowedRewardOptionIds: seedSlugsToIds(preset.rewardSlugs),
      allowedPunishmentOptionIds: seedSlugsToIds(preset.punishmentSlugs),
      allowCustomReward: preset.allowCustomReward,
      allowCustomPunishment: preset.allowCustomPunishment,
      charityModeEnabled: charity.charityModeEnabled,
      charitySelection: charity.charitySelection,
      charityName: charity.charityName,
      charityUrl: charity.charityUrl,
    })
    .returning();

  await db.insert(groupMemberships).values({
    groupId: created.id,
    userId,
    role: "owner",
  });

  revalidatePath("/groups");
  redirect(`/groups/${created.slug}/pledge/new`);
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
  if (group.archivedAt) {
    throw new Error("This pantheon has been archived by its founder.");
  }

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
  allowedRewardOptionIds: z.array(z.string()).max(50),
  allowedPunishmentOptionIds: z.array(z.string()).max(50),
  allowCustomReward: z.boolean(),
  allowCustomPunishment: z.boolean(),
});

async function requireOwnerGroup(slug: string, userId: string) {
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);
  if (!group) throw new Error("Pantheon not found");
  if (group.ownerId !== userId) {
    throw new Error("Only the founder may amend the rite");
  }
  return group;
}

async function validateOptionIds(
  groupId: string,
  ids: string[],
  type: "reward" | "punishment",
): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ id: pledgeOptions.id })
    .from(pledgeOptions)
    .where(
      and(
        eq(pledgeOptions.type, type),
        inArray(pledgeOptions.id, ids),
        or(
          isNull(pledgeOptions.groupId),
          eq(pledgeOptions.groupId, groupId),
        ),
      ),
    );
  return rows.map((r) => r.id);
}

export async function updateGroupSettingsAction(formData: FormData) {
  const userId = await requireUserId();
  const slug = String(formData.get("slug") ?? "");
  const group = await requireOwnerGroup(slug, userId);

  const parsed = settingsSchema.parse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    isPublic: formData.get("isPublic") === "on",
    strikeLimit: Number(formData.get("strikeLimit") ?? 0),
    allowedRewardOptionIds: formData
      .getAll("allowedRewardOptionIds")
      .map(String),
    allowedPunishmentOptionIds: formData
      .getAll("allowedPunishmentOptionIds")
      .map(String),
    allowCustomReward: formData.get("allowCustomReward") === "on",
    allowCustomPunishment: formData.get("allowCustomPunishment") === "on",
  });

  const charity = normalizeCharity(readCharityForm(formData));

  const validRewards = await validateOptionIds(
    group.id,
    parsed.allowedRewardOptionIds,
    "reward",
  );
  const validPunishments = await validateOptionIds(
    group.id,
    parsed.allowedPunishmentOptionIds,
    "punishment",
  );

  if (
    validRewards.length === 0 &&
    !parsed.allowCustomReward
  ) {
    throw new Error(
      "Pick at least one reward option, or allow members to write their own.",
    );
  }
  if (
    validPunishments.length === 0 &&
    !parsed.allowCustomPunishment
  ) {
    throw new Error(
      "Pick at least one punishment option, or allow members to write their own.",
    );
  }

  await db
    .update(groups)
    .set({
      name: parsed.name,
      description: parsed.description,
      isPublic: parsed.isPublic,
      strikeLimit: parsed.strikeLimit,
      allowedRewardOptionIds: validRewards,
      allowedPunishmentOptionIds: validPunishments,
      allowCustomReward: parsed.allowCustomReward,
      allowCustomPunishment: parsed.allowCustomPunishment,
      charityModeEnabled: charity.charityModeEnabled,
      charitySelection: charity.charitySelection,
      charityName: charity.charityName,
      charityUrl: charity.charityUrl,
    })
    .where(eq(groups.id, group.id));

  revalidatePath(`/groups/${slug}`);
  revalidatePath(`/groups/${slug}/settings`);
  redirect(`/groups/${slug}`);
}

export async function archiveGroupAction(formData: FormData) {
  const userId = await requireUserId();
  const slug = String(formData.get("slug") ?? "");
  const group = await requireOwnerGroup(slug, userId);

  await db
    .update(groups)
    .set({ archivedAt: new Date() })
    .where(eq(groups.id, group.id));

  revalidatePath("/groups");
  revalidatePath("/dashboard");
  revalidatePath("/check-in");
  revalidatePath(`/groups/${slug}`);
  revalidatePath(`/groups/${slug}/settings`);
  redirect("/dashboard");
}

export async function unarchiveGroupAction(formData: FormData) {
  const userId = await requireUserId();
  const slug = String(formData.get("slug") ?? "");
  const group = await requireOwnerGroup(slug, userId);

  await db
    .update(groups)
    .set({ archivedAt: null })
    .where(eq(groups.id, group.id));

  revalidatePath("/groups");
  revalidatePath("/dashboard");
  revalidatePath("/check-in");
  revalidatePath(`/groups/${slug}`);
  revalidatePath(`/groups/${slug}/settings`);
  redirect(`/groups/${slug}/settings`);
}

export async function deleteGroupAction(formData: FormData) {
  const userId = await requireUserId();
  const slug = String(formData.get("slug") ?? "");
  const confirmName = String(formData.get("confirmName") ?? "").trim();
  const group = await requireOwnerGroup(slug, userId);

  if (confirmName !== group.name) {
    throw new Error(
      "To dissolve a pantheon, retype its name exactly.",
    );
  }

  // Cascade FKs handle memberships, pledges, activities, checkins, swaps,
  // and group-scoped pledge options.
  await db.delete(groups).where(eq(groups.id, group.id));

  revalidatePath("/groups");
  revalidatePath("/dashboard");
  revalidatePath("/check-in");
  redirect("/dashboard");
}

const customOptionSchema = z.object({
  type: z.enum(PLEDGE_OPTION_TYPES),
  label: z.string().min(2).max(60),
  description: z.string().max(280).default(""),
  intensity: z.enum(PLEDGE_OPTION_INTENSITIES).default("standard"),
  isSensitive: z.boolean(),
});

export async function addCustomOptionAction(formData: FormData) {
  const userId = await requireUserId();
  const slug = String(formData.get("slug") ?? "");
  const group = await requireOwnerGroup(slug, userId);

  const parsed = customOptionSchema.parse({
    type: String(formData.get("type") ?? ""),
    label: String(formData.get("label") ?? ""),
    description: String(formData.get("description") ?? ""),
    intensity: String(formData.get("intensity") ?? "standard"),
    isSensitive: formData.get("isSensitive") === "on",
  });

  const newSlug = slugify(parsed.label) || `custom-${Date.now()}`;
  const [inserted] = await db
    .insert(pledgeOptions)
    .values({
      slug: newSlug,
      label: parsed.label,
      description: parsed.description,
      type: parsed.type,
      intensity: parsed.intensity,
      isSensitive: parsed.isSensitive,
      groupId: group.id,
    })
    .returning({ id: pledgeOptions.id });

  const column =
    parsed.type === "reward"
      ? "allowedRewardOptionIds"
      : "allowedPunishmentOptionIds";
  const current =
    parsed.type === "reward"
      ? group.allowedRewardOptionIds
      : group.allowedPunishmentOptionIds;
  await db
    .update(groups)
    .set({ [column]: [...current, inserted.id] })
    .where(eq(groups.id, group.id));

  revalidatePath(`/groups/${slug}/settings`);
  redirect(`/groups/${slug}/settings`);
}
