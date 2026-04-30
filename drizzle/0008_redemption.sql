ALTER TABLE "pledges" ADD COLUMN IF NOT EXISTS "redemption_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pledges" ADD COLUMN IF NOT EXISTS "redemption_started_on" date;--> statement-breakpoint
ALTER TABLE "pledges" ADD COLUMN IF NOT EXISTS "redeemed_strike_limit" integer;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "redeemed_target_amount" integer;
