ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "charity_mode_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "charity_selection" text DEFAULT 'individual' NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "charity_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "charity_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "pledges" ADD COLUMN IF NOT EXISTS "charity_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "pledges" ADD COLUMN IF NOT EXISTS "charity_url" text DEFAULT '' NOT NULL;
