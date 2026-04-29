import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "@/lib/id";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  timezone: text("timezone").notNull().default("UTC"),
  faceStyle: integer("face_style"),
  faceColor: integer("face_color"),
  faceGaze: integer("face_gaze"),
  faceDepth: integer("face_depth"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const groups = pgTable(
  "groups",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    isPublic: boolean("is_public").notNull().default(true),
    strikeLimit: integer("strike_limit").notNull().default(0),
    inviteToken: text("invite_token").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("groups_slug_idx").on(t.slug)],
);

export const groupMemberships = pgTable(
  "group_memberships",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("group_memberships_group_user_idx").on(t.groupId, t.userId),
    index("group_memberships_user_idx").on(t.userId),
  ],
);

export const pledges = pgTable(
  "pledges",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    pledgeText: text("pledge_text").notNull().default(""),
    rewardText: text("reward_text").notNull().default(""),
    punishmentText: text("punishment_text").notNull().default(""),
    outcomeText: text("outcome_text").notNull().default(""),
    outcomeAchievedAt: timestamp("outcome_achieved_at", { withTimezone: true }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("pledges_user_group_idx").on(t.userId, t.groupId),
    index("pledges_group_idx").on(t.groupId),
  ],
);

export const activities = pgTable(
  "activities",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    pledgeId: text("pledge_id")
      .notNull()
      .references(() => pledges.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    kind: text("kind").notNull().default("do"),
    targetAmount: integer("target_amount"),
    unit: text("unit"),
  },
  (t) => [index("activities_pledge_idx").on(t.pledgeId)],
);

export const dailyCheckins = pgTable(
  "daily_checkins",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    completed: boolean("completed").notNull().default(false),
    amount: integer("amount"),
    photoUrl: text("photo_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("daily_checkins_user_activity_date_idx").on(
      t.userId,
      t.activityId,
      t.date,
    ),
    index("daily_checkins_activity_idx").on(t.activityId),
  ],
);

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("journal_entries_user_date_idx").on(t.userId, t.date),
  ],
);

export const ACTIVITY_KINDS = ["do", "abstain", "monthly_total"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export type User = typeof users.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMembership = typeof groupMemberships.$inferSelect;
export type Pledge = typeof pledges.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type DailyCheckin = typeof dailyCheckins.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;

