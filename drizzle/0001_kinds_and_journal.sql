CREATE TABLE "journal_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "kind" text DEFAULT 'do' NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "target_amount" integer;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "unit" text;--> statement-breakpoint
ALTER TABLE "daily_checkins" ADD COLUMN "amount" integer;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "journal_entries_user_date_idx" ON "journal_entries" USING btree ("user_id","date");