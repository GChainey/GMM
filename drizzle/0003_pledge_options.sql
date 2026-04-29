CREATE TABLE "pledge_options" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"type" text NOT NULL,
	"intensity" text DEFAULT 'standard' NOT NULL,
	"is_sensitive" boolean DEFAULT false NOT NULL,
	"group_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "allowed_reward_option_ids" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "allowed_punishment_option_ids" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "allow_custom_reward" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "allow_custom_punishment" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "pledges" ADD COLUMN "reward_option_id" text;--> statement-breakpoint
ALTER TABLE "pledges" ADD COLUMN "punishment_option_id" text;--> statement-breakpoint
ALTER TABLE "pledge_options" ADD CONSTRAINT "pledge_options_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pledge_options_group_idx" ON "pledge_options" USING btree ("group_id");--> statement-breakpoint
INSERT INTO "pledge_options" ("id", "slug", "label", "description", "type", "intensity", "is_sensitive") VALUES
  ('seed_reward_experience', 'experience', 'Experience', 'Treat thyself to a memorable outing or trip.', 'reward', 'standard', false),
  ('seed_reward_purchase', 'purchase', 'Purchase', 'Buy that thing thou hast long coveted.', 'reward', 'standard', false),
  ('seed_reward_gratitude', 'gratitude', 'Gratitude', 'Be honoured by friends and family.', 'reward', 'mild', false),
  ('seed_reward_cash', 'cash', 'Cash bounty', 'A cash sum awaits the ascended.', 'reward', 'standard', false),
  ('seed_reward_social', 'social', 'Social glory', 'Public celebration with thy circle.', 'reward', 'standard', false),
  ('seed_punishment_charity', 'charity', 'Charity donation', 'Donate a sum to a chosen cause.', 'punishment', 'mild', false),
  ('seed_punishment_chore', 'chore', 'Chore penance', 'A tedious chore for thy circle.', 'punishment', 'standard', false),
  ('seed_punishment_cash_forfeit', 'cash_forfeit', 'Cash forfeit', 'Forfeit a sum (to charity, friends, or jar).', 'punishment', 'standard', false),
  ('seed_punishment_embarrassment', 'embarrassment', 'Embarrassment', 'A humbling deed thou must perform.', 'punishment', 'hardcore', true),
  ('seed_punishment_public_shame', 'public_shame', 'Public shame', 'Confess thy fall publicly.', 'punishment', 'hardcore', true)
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
UPDATE "groups" SET
  "allowed_reward_option_ids" = ARRAY(SELECT id FROM "pledge_options" WHERE type = 'reward' AND group_id IS NULL),
  "allowed_punishment_option_ids" = ARRAY(SELECT id FROM "pledge_options" WHERE type = 'punishment' AND group_id IS NULL)
WHERE cardinality("allowed_reward_option_ids") = 0 AND cardinality("allowed_punishment_option_ids") = 0;