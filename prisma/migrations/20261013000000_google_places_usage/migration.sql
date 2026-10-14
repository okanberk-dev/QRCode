-- Google Places budget counters (additive, no content stored).
--
-- One row per (kind, scope, UTC day). The profile/search routes reserve a
-- call with a single atomic INSERT ... ON CONFLICT ... WHERE count < cap, so
-- the daily ceiling holds across Vercel instances without Upstash.
-- New table only: safe for the shared preview/production database.

CREATE TABLE "google_places_usage" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_places_usage_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "google_places_usage_updated_at_idx" ON "google_places_usage"("updated_at");
