CREATE TABLE IF NOT EXISTS "group_daily_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"date" date NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"photo_url" text,
	"author_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_daily_posts" ADD CONSTRAINT "group_daily_posts_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_daily_posts" ADD CONSTRAINT "group_daily_posts_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "group_daily_posts_group_date_idx" ON "group_daily_posts" ("group_id","date");
