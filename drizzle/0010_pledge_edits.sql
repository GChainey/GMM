CREATE TABLE IF NOT EXISTS "pledge_edits" (
	"id" text PRIMARY KEY NOT NULL,
	"pledge_id" text NOT NULL,
	"user_id" text NOT NULL,
	"group_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pledge_edits" ADD CONSTRAINT "pledge_edits_pledge_id_pledges_id_fk" FOREIGN KEY ("pledge_id") REFERENCES "pledges"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pledge_edits" ADD CONSTRAINT "pledge_edits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pledge_edits" ADD CONSTRAINT "pledge_edits_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pledge_edits_pledge_idx" ON "pledge_edits" ("pledge_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pledge_edits_user_idx" ON "pledge_edits" ("user_id","created_at");
