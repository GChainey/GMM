ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "outcome_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "outcome_achieved_at" timestamp with time zone;--> statement-breakpoint
UPDATE "activities" a
SET
  "outcome_text" = p."outcome_text",
  "outcome_achieved_at" = p."outcome_achieved_at"
FROM "pledges" p
WHERE a."pledge_id" = p."id"
  AND a."id" = (
    SELECT a2."id"
    FROM "activities" a2
    WHERE a2."pledge_id" = p."id"
    ORDER BY a2."sort_order", a2."id"
    LIMIT 1
  )
  AND COALESCE(NULLIF(p."outcome_text", ''), '') <> '';--> statement-breakpoint
ALTER TABLE "pledges" DROP COLUMN IF EXISTS "outcome_text";--> statement-breakpoint
ALTER TABLE "pledges" DROP COLUMN IF EXISTS "outcome_achieved_at";