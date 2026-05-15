-- BillingSubscription canonical tier link (CLAUDE.md §15.2 + §38.200).
-- Marketing pricing tier'larıyla (Starter/Growth/Pro — SubscriptionPlan satırları)
-- owner subscription'ları arasında doğrudan FK. Legacy `plan` kolonu lifecycle/
-- bucket (trial/monthly/yearly/enterprise/free) kalır; `subscription_plan_id`
-- gerçek tier referansını tutar. Plan silinirse `ON DELETE SET NULL` — audit
-- log korunur, subscription `plan` field'ına düşer.
--
-- Nullable + default null: mevcut row'lar etkilenmez (backwards-compat, CLAUDE.md §21.18).

ALTER TABLE "billing_subscriptions"
  ADD COLUMN "subscription_plan_id" TEXT;

ALTER TABLE "billing_subscriptions"
  ADD CONSTRAINT "billing_subscriptions_subscription_plan_id_fkey"
  FOREIGN KEY ("subscription_plan_id")
  REFERENCES "subscription_plans"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "billing_subscriptions_subscription_plan_id_idx"
  ON "billing_subscriptions"("subscription_plan_id");
