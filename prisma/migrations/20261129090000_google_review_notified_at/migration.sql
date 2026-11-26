-- Google review alert mails now fire when a sync stores a new review
-- (CLAUDE.md §54). NULL = new, not yet handled.
ALTER TABLE "google_reviews" ADD COLUMN "notified_at" TIMESTAMP(3);

-- Existing rows count as handled, except rows newer than the old hourly
-- alert cron's per-location watermark (it had not mailed them yet).
UPDATE "google_reviews" gr
SET "notified_at" = NOW()
WHERE gr."create_time" IS NULL
   OR gr."create_time" <= COALESCE(
     (
       SELECT MAX(
         CASE
           WHEN (gi."locations_json" -> 'restaurantLocations' -> gr."restaurant_id" ->> 'lastReviewNotifiedAt')
                ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
           THEN ((gi."locations_json" -> 'restaurantLocations' -> gr."restaurant_id" ->> 'lastReviewNotifiedAt')::timestamptz AT TIME ZONE 'UTC')
         END
       )
       FROM "google_integrations" gi
       JOIN "restaurants" r ON r."user_id" = gi."user_id"
       WHERE r."id" = gr."restaurant_id"
     ),
     NOW() AT TIME ZONE 'UTC'
   );

CREATE INDEX "google_reviews_notified_at_idx" ON "google_reviews"("notified_at");
