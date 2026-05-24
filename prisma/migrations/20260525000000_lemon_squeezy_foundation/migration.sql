-- Lemon Squeezy foundation migration (CLAUDE.md §44, 2026-05-25)
--
-- Phased write-side billing integration. This migration is **additive only**
-- — no existing column dropped, every new column nullable or default'lu.
-- Backwards-compat: manuel admin akışı intact, mevcut row'lar source='manual'
-- + paymentProvider='manual' default'larıyla devam eder.

-- ── BillingSubscription extensions ──
ALTER TABLE "billing_subscriptions"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "lemon_squeezy_customer_id" TEXT,
  ADD COLUMN "lemon_squeezy_variant_id" TEXT,
  ADD COLUMN "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "billing_subscriptions_lemon_squeezy_customer_id_idx"
  ON "billing_subscriptions"("lemon_squeezy_customer_id");

-- ── BillingInvoice extensions ──
ALTER TABLE "billing_invoices"
  ADD COLUMN "receipt_url" TEXT,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';

-- ── SubscriptionPlan extensions (variant mapping) ──
ALTER TABLE "subscription_plans"
  ADD COLUMN "payment_provider" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "ls_variant_id_usd_monthly" TEXT,
  ADD COLUMN "ls_variant_id_usd_yearly" TEXT,
  ADD COLUMN "ls_variant_id_try_monthly" TEXT,
  ADD COLUMN "ls_variant_id_try_yearly" TEXT;

-- ── LemonSqueezyEvent (webhook audit + idempotency) ──
CREATE TABLE "lemon_squeezy_events" (
  "id" TEXT NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "event_name" TEXT NOT NULL,
  "resource_type" TEXT,
  "resource_id" TEXT,
  "payload" JSONB NOT NULL,
  "processed_at" TIMESTAMP(3),
  "error" TEXT,
  "received_count" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lemon_squeezy_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lemon_squeezy_events_payload_hash_key"
  ON "lemon_squeezy_events"("payload_hash");
CREATE INDEX "lemon_squeezy_events_event_name_created_at_idx"
  ON "lemon_squeezy_events"("event_name", "created_at");
CREATE INDEX "lemon_squeezy_events_resource_type_resource_id_idx"
  ON "lemon_squeezy_events"("resource_type", "resource_id");
CREATE INDEX "lemon_squeezy_events_processed_at_idx"
  ON "lemon_squeezy_events"("processed_at");
