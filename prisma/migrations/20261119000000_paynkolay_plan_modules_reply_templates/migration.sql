-- PayNKolay replaces Dodo Payments (CLAUDE.md §44). The Dodo column
-- `subscription_plans.dodo_product_id` and the `dodo_webhook_events` table
-- are intentionally NOT dropped here: the previous container keeps serving
-- while this deploy builds, and it still reads them. Drop them in a later
-- migration once nothing old is running.

-- Plans that pointed at Dodo fall back to manual billing.
UPDATE "subscription_plans" SET "payment_provider" = 'manual' WHERE "payment_provider" = 'dodo_payments';

-- Package modules (CLAUDE.md §5.2).
ALTER TABLE "subscription_plans"
  ADD COLUMN "module_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "modules_managed" BOOLEAN NOT NULL DEFAULT false;

-- Card payments on the PayNKolay hosted page.
CREATE TABLE "billing_payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_plan_id" TEXT,
    "billing_cycle" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reference_code" TEXT,
    "failure_reason" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "billing_payments_reference_code_key" ON "billing_payments"("reference_code");
CREATE INDEX "billing_payments_user_id_created_at_idx" ON "billing_payments"("user_id", "created_at");

-- Saved reply templates (workspace-shared).
CREATE TABLE "reply_templates" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reply_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reply_templates_owner_user_id_updated_at_idx" ON "reply_templates"("owner_user_id", "updated_at");
ALTER TABLE "reply_templates" ADD CONSTRAINT "reply_templates_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
