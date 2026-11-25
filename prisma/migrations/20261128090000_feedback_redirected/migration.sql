-- High-rating redirects are events, not reviews (CLAUDE.md §58). They used to
-- be stored with the marker comment 'High Rating Redirect'; mark them with a
-- flag and drop the marker so they count as textless ratings everywhere.
ALTER TABLE "feedback" ADD COLUMN "redirected" BOOLEAN NOT NULL DEFAULT false;

UPDATE "feedback"
SET "redirected" = true, "comment" = NULL
WHERE "comment" = 'High Rating Redirect';

CREATE INDEX "feedback_restaurant_id_redirected_created_at_idx"
  ON "feedback" ("restaurant_id", "redirected", "created_at");
