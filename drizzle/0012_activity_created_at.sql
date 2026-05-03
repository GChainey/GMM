ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
-- Backfill: an activity's created_at is the earliest pledge_edit whose
-- after-snapshot already names this activity id. Falls back to the parent
-- pledge's created_at for activities that pre-date the pledge_edits table,
-- and finally to now() for anything we cannot date.
UPDATE "activities" a
SET "created_at" = COALESCE(
  (
    SELECT MIN(pe."created_at")
    FROM "pledge_edits" pe,
         jsonb_array_elements(pe."after"->'activities') AS act
    WHERE pe."pledge_id" = a."pledge_id"
      AND act->>'id' = a."id"
  ),
  (SELECT p."created_at" FROM "pledges" p WHERE p."id" = a."pledge_id"),
  now()
);
