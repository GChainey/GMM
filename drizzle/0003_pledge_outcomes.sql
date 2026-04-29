ALTER TABLE "pledges" ADD COLUMN "outcome_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "pledges" ADD COLUMN "outcome_achieved_at" timestamp with time zone;
