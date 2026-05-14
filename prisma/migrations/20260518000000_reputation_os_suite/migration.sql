-- CLAUDE.md §X — Reputation OS Suite migration.
--
-- Adds two new tables:
--   1. google_review_ai_drafts — per-review AI draft cache for Google
--      reviews (FeedbackAiDraft equivalent, keyed by external resource name).
--   2. restaurant_health_snapshots — baseline + monthly snapshot history
--      for "before vs after Buaze" comparison + monthly health report mail.
--
-- All fields nullable + default'lu (CLAUDE.md §21.18 preview deploy safety).
-- Cascade on restaurant delete keeps caches clean.

-- google_review_ai_drafts
CREATE TABLE "google_review_ai_drafts" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "review_name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment_hash" TEXT,
    "body" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ai_copilot',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latency_ms" INTEGER,

    CONSTRAINT "google_review_ai_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "google_review_ai_drafts_restaurant_id_review_name_key"
    ON "google_review_ai_drafts"("restaurant_id", "review_name");

CREATE INDEX "google_review_ai_drafts_restaurant_id_generated_at_idx"
    ON "google_review_ai_drafts"("restaurant_id", "generated_at");

ALTER TABLE "google_review_ai_drafts"
    ADD CONSTRAINT "google_review_ai_drafts_restaurant_id_fkey"
    FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- restaurant_health_snapshots
CREATE TABLE "restaurant_health_snapshots" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "google_rating" DOUBLE PRECISION,
    "google_review_count" INTEGER,
    "google_media_count" INTEGER,
    "google_unanswered_questions" INTEGER,
    "profile_complete" INTEGER,
    "feedback_total" INTEGER,
    "feedback_avg_rating" DOUBLE PRECISION,
    "feedback_low_rated" INTEGER,
    "feedback_replied" INTEGER,
    "health_score" INTEGER,
    "notes" TEXT,

    CONSTRAINT "restaurant_health_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "restaurant_health_snapshots_restaurant_id_kind_captured_at_key"
    ON "restaurant_health_snapshots"("restaurant_id", "kind", "captured_at");

CREATE INDEX "restaurant_health_snapshots_restaurant_id_captured_at_idx"
    ON "restaurant_health_snapshots"("restaurant_id", "captured_at");

CREATE INDEX "restaurant_health_snapshots_restaurant_id_kind_idx"
    ON "restaurant_health_snapshots"("restaurant_id", "kind");

ALTER TABLE "restaurant_health_snapshots"
    ADD CONSTRAINT "restaurant_health_snapshots_restaurant_id_fkey"
    FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
