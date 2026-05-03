CREATE TABLE IF NOT EXISTS "group_proof_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"date" date NOT NULL,
	"checkin_id" text NOT NULL,
	"voter_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_proof_votes" ADD CONSTRAINT "group_proof_votes_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_proof_votes" ADD CONSTRAINT "group_proof_votes_checkin_id_daily_checkins_id_fk" FOREIGN KEY ("checkin_id") REFERENCES "daily_checkins"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_proof_votes" ADD CONSTRAINT "group_proof_votes_voter_user_id_users_id_fk" FOREIGN KEY ("voter_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "group_proof_votes_group_date_voter_idx" ON "group_proof_votes" ("group_id","date","voter_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_proof_votes_group_date_idx" ON "group_proof_votes" ("group_id","date");
--> statement-breakpoint
ALTER TABLE "group_daily_posts" DROP COLUMN IF EXISTS "photo_url";
