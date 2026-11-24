-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "google_reply_settings" JSONB;

-- CreateTable
CREATE TABLE "google_reviews" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "review_name" TEXT NOT NULL,
    "reviewer_name" TEXT,
    "reviewer_photo_url" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER,
    "comment" TEXT,
    "original_text" TEXT,
    "translated_text" TEXT,
    "language" VARCHAR(8),
    "has_text" BOOLEAN NOT NULL DEFAULT false,
    "create_time" TIMESTAMP(3),
    "update_time" TIMESTAMP(3),
    "has_reply" BOOLEAN NOT NULL DEFAULT false,
    "reply_comment" TEXT,
    "reply_update_time" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_reply_jobs" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "total" INTEGER NOT NULL,
    "lease_until" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_reply_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_reply_job_items" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3),
    "error_code" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_reply_job_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "google_reviews_restaurant_id_has_reply_create_time_idx" ON "google_reviews"("restaurant_id", "has_reply", "create_time");

-- CreateIndex
CREATE INDEX "google_reviews_restaurant_id_create_time_idx" ON "google_reviews"("restaurant_id", "create_time");

-- CreateIndex
CREATE UNIQUE INDEX "google_reviews_restaurant_id_review_id_key" ON "google_reviews"("restaurant_id", "review_id");

-- CreateIndex
CREATE INDEX "google_reply_jobs_restaurant_id_created_at_idx" ON "google_reply_jobs"("restaurant_id", "created_at");

-- CreateIndex
CREATE INDEX "google_reply_jobs_status_updated_at_idx" ON "google_reply_jobs"("status", "updated_at");

-- CreateIndex
CREATE INDEX "google_reply_job_items_job_id_status_idx" ON "google_reply_job_items"("job_id", "status");

-- CreateIndex
CREATE INDEX "google_reply_job_items_review_id_status_idx" ON "google_reply_job_items"("review_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "google_reply_job_items_job_id_review_id_key" ON "google_reply_job_items"("job_id", "review_id");

-- AddForeignKey
ALTER TABLE "google_reviews" ADD CONSTRAINT "google_reviews_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_reply_jobs" ADD CONSTRAINT "google_reply_jobs_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_reply_job_items" ADD CONSTRAINT "google_reply_job_items_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "google_reply_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

