CREATE TABLE IF NOT EXISTS "goal_swaps" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"initiator_user_id" text NOT NULL,
	"target_user_id" text NOT NULL,
	"swap_date" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goal_swaps" ADD CONSTRAINT "goal_swaps_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goal_swaps" ADD CONSTRAINT "goal_swaps_initiator_user_id_users_id_fk" FOREIGN KEY ("initiator_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goal_swaps" ADD CONSTRAINT "goal_swaps_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goal_swaps_group_date_idx" ON "goal_swaps" ("group_id","swap_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goal_swaps_initiator_idx" ON "goal_swaps" ("initiator_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goal_swaps_target_idx" ON "goal_swaps" ("target_user_id");
