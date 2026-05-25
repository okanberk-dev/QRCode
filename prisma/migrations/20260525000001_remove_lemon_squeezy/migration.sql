-- Stage 140 §38.220 — Remove Lemon Squeezy integration (CLAUDE.md §44 rewrite).
--
-- Lemon Squeezy was added in Stage 137 §38.217 (migration 20260525000000)
-- but never set up in production. Switching to Dodo Payments instead;
-- all Lemon Squeezy-specific tables/columns are removed.
--
-- Preserved (generic for any payment provider):
--   • BillingSubscription.source            — 'manual' | 'dodo_payments' | 'iyzico'
--   • BillingSubscription.cancelAtPeriodEnd — generic cancel-at-period-end flag
--   • BillingInvoice.receiptUrl             — provider-issued receipt URL
--   • BillingInvoice.source                 — provider audit
--   • SubscriptionPlan.paymentProvider      — 'manual' | 'dodo_payments' | 'iyzico'
--
-- Dropped (Lemon Squeezy-specific, replaced by Dodo equivalents):
--   • BillingSubscription.lemonSqueezyCustomerId
--   • BillingSubscription.lemonSqueezyVariantId
--   • SubscriptionPlan.lsVariantId{UsdMonthly,UsdYearly,TryMonthly,TryYearly}
--   • LemonSqueezyEvent table (idempotency) — Dodo SDK handles signature verify
--     internally; if we need event audit later, we'll add a generic
--     `PaymentProviderEvent` table.

-- Drop Lemon Squeezy idempotency table (no rows in production — added Stage 137
-- but never received a real webhook).
DROP TABLE IF EXISTS "lemon_squeezy_events";

-- Drop the index on lemon_squeezy_customer_id before the column itself.
DROP INDEX IF EXISTS "billing_subscriptions_lemon_squeezy_customer_id_idx";

ALTER TABLE "billing_subscriptions"
  DROP COLUMN IF EXISTS "lemon_squeezy_customer_id",
  DROP COLUMN IF EXISTS "lemon_squeezy_variant_id";

-- Generic provider customer ID — Dodo Payments customer_id, Iyzico
-- customer ref, Stripe customer_id (gelecek scope). Owner customer portal
-- redirect için /customer-portal route'a query param olarak geçer.
-- BillingSubscription.providerRef = subscription_id; provider_customer_id
-- = customer_id (Dodo'da ikisi ayrı resource).
ALTER TABLE "billing_subscriptions"
  ADD COLUMN IF NOT EXISTS "provider_customer_id" TEXT;

CREATE INDEX IF NOT EXISTS "billing_subscriptions_provider_customer_id_idx"
  ON "billing_subscriptions"("provider_customer_id");

ALTER TABLE "subscription_plans"
  DROP COLUMN IF EXISTS "ls_variant_id_usd_monthly",
  DROP COLUMN IF EXISTS "ls_variant_id_usd_yearly",
  DROP COLUMN IF EXISTS "ls_variant_id_try_monthly",
  DROP COLUMN IF EXISTS "ls_variant_id_try_yearly";

-- Add Dodo Payments product ID slot. One ID per tier (Dodo product = a SaaS
-- subscription tier; customer picks billing cycle/currency on the checkout
-- page). Simpler than Lemon Squeezy's 4-slot variant matrix.
ALTER TABLE "subscription_plans"
  ADD COLUMN IF NOT EXISTS "dodo_product_id" TEXT;
