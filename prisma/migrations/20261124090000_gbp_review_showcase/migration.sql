-- Public Google review showcase cache (CLAUDE.md §53). Additive: a new table,
-- no existing column changes.
CREATE TABLE "google_review_caches" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "location_name" TEXT,
    "average_rating" DOUBLE PRECISION,
    "total_review_count" INTEGER NOT NULL DEFAULT 0,
    "reviews" JSONB,
    "reviews_url" TEXT,
    "fetched_at" TIMESTAMP(3),
    "last_attempt_at" TIMESTAMP(3),
    "next_attempt_at" TIMESTAMP(3),
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "last_error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_review_caches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "google_review_caches_restaurant_id_key" ON "google_review_caches"("restaurant_id");

ALTER TABLE "google_review_caches" ADD CONSTRAINT "google_review_caches_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Which OAuth client issued the stored tokens + connection invalidation state.
ALTER TABLE "google_integrations" ADD COLUMN "client_id" TEXT;
ALTER TABLE "google_integrations" ADD COLUMN "invalidated_at" TIMESTAMP(3);
ALTER TABLE "google_integrations" ADD COLUMN "invalid_reason" TEXT;
