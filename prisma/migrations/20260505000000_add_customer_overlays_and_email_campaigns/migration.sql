-- §38.48 Wave 2 — Customer overlay mini-models + email campaigns.
-- Buaze müşterileri Feedback-derived (CLAUDE.md §4.5); bu 4 tablo overlay
-- olarak owner customer list'ine LEFT JOIN ile uygulanır.

-- CreateTable
CREATE TABLE "customer_archives" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "contact_key" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_by_id" TEXT,

    CONSTRAINT "customer_archives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_segment_overrides" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "contact_key" TEXT NOT NULL,
    "manual_segment" TEXT NOT NULL,
    "set_by_id" TEXT,
    "set_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_segment_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_email_campaigns" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_email_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_email_logs" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "contact_key" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_archives_restaurant_id_contact_key_key" ON "customer_archives"("restaurant_id", "contact_key");

-- CreateIndex
CREATE INDEX "customer_archives_restaurant_id_archived_at_idx" ON "customer_archives"("restaurant_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_segment_overrides_restaurant_id_contact_key_key" ON "customer_segment_overrides"("restaurant_id", "contact_key");

-- CreateIndex
CREATE INDEX "customer_segment_overrides_restaurant_id_set_at_idx" ON "customer_segment_overrides"("restaurant_id", "set_at");

-- CreateIndex
CREATE INDEX "customer_email_campaigns_restaurant_id_created_at_idx" ON "customer_email_campaigns"("restaurant_id", "created_at");

-- CreateIndex
CREATE INDEX "customer_email_campaigns_restaurant_id_status_idx" ON "customer_email_campaigns"("restaurant_id", "status");

-- CreateIndex
CREATE INDEX "customer_email_logs_campaign_id_idx" ON "customer_email_logs"("campaign_id");

-- CreateIndex
CREATE INDEX "customer_email_logs_restaurant_id_created_at_idx" ON "customer_email_logs"("restaurant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_email_logs_campaign_id_contact_key_key" ON "customer_email_logs"("campaign_id", "contact_key");

-- AddForeignKey
ALTER TABLE "customer_archives" ADD CONSTRAINT "customer_archives_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_segment_overrides" ADD CONSTRAINT "customer_segment_overrides_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_email_campaigns" ADD CONSTRAINT "customer_email_campaigns_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_email_logs" ADD CONSTRAINT "customer_email_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "customer_email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_email_logs" ADD CONSTRAINT "customer_email_logs_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
