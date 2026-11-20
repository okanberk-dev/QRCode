-- Saved cards (PayNKolay card storage) + opt-in auto-renew: foundation (CLAUDE.md §44).
-- Additive only: no DROP, no type change. New NOT NULL columns carry constant
-- defaults (metadata-only on PostgreSQL >= 11), so the old container keeps
-- serving while this runs. The billing_settings row is NOT inserted here:
-- `scripts/billing-bind-env.ts --env live|test` binds a database explicitly,
-- and until then every billing flag stays off.
--
-- Prisma does not model CHECK constraints; they live only in this SQL (and
-- `prisma migrate diff` ignores them). They make a plaintext customer key, a
-- PAN-like digit run or an unknown enum value impossible to store by accident.

-- 1) users: reCAPTCHA score of the last assessed sign-in (checkout gate).
ALTER TABLE "users"
  ADD COLUMN "last_login_risk_score" DOUBLE PRECISION,
  ADD COLUMN "last_login_risk_at" TIMESTAMP(3);

-- 2) billing_subscriptions: opt-in auto-renew state (default off).
ALTER TABLE "billing_subscriptions"
  ADD COLUMN "auto_renew" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "auto_renew_consent_id" TEXT,
  ADD COLUMN "auto_renew_changed_at" TIMESTAMP(3),
  ADD COLUMN "billing_anchor_day" INTEGER;
CREATE INDEX "billing_subscriptions_auto_renew_renews_at_idx" ON "billing_subscriptions"("auto_renew", "renews_at");

-- 3) billing_payments: payment kind, environment binding, renewal link,
--    provider outcome and refund queue fields.
ALTER TABLE "billing_payments"
  ADD COLUMN "kind" VARCHAR(16) NOT NULL DEFAULT 'checkout',
  ADD COLUMN "provider_env" VARCHAR(8),
  ADD COLUMN "renewal_id" TEXT,
  ADD COLUMN "attempt_no" INTEGER,
  ADD COLUMN "save_card" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "card_alias" VARCHAR(32),
  ADD COLUMN "card_save_result" VARCHAR(16),
  ADD COLUMN "auto_renew_consent_id" TEXT,
  ADD COLUMN "charge_card_id" TEXT,
  ADD COLUMN "confirm_after" TIMESTAMP(3),
  ADD COLUMN "confirm_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "provider_outcome" VARCHAR(20),
  ADD COLUMN "provider_outcome_at" TIMESTAMP(3),
  ADD COLUMN "provider_decline_code" VARCHAR(16),
  ADD COLUMN "refund_on_success" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "refund_state" VARCHAR(12),
  ADD COLUMN "refund_reason" VARCHAR(32),
  ADD CONSTRAINT "billing_payments_kind_valid" CHECK ("kind" IN ('checkout','renewal_link','renewal_auto')),
  ADD CONSTRAINT "billing_payments_env_valid" CHECK ("provider_env" IS NULL OR "provider_env" IN ('live','test')),
  ADD CONSTRAINT "billing_payments_refund_state_valid" CHECK ("refund_state" IS NULL OR "refund_state" IN ('required','refunded','waived'));
-- One payment row per renewal attempt (NULLs allowed, so checkout rows are unaffected).
CREATE UNIQUE INDEX "billing_payments_renewal_id_attempt_no_key" ON "billing_payments"("renewal_id", "attempt_no");
CREATE INDEX "billing_payments_status_created_at_idx" ON "billing_payments"("status", "created_at");
CREATE INDEX "billing_payments_refund_state_idx" ON "billing_payments"("refund_state");

-- 4) billing_settings: singleton that binds this database to one PayNKolay
--    environment, plus the engine's tick lease, breaker and daily markers.
CREATE TABLE "billing_settings" (
  "id" VARCHAR(16) NOT NULL DEFAULT 'singleton',
  "provider_env" VARCHAR(8) NOT NULL,
  "breaker_until" TIMESTAMP(3),
  "breaker_reason" VARCHAR(40),
  "breaker_tripped_at" TIMESTAMP(3)[] NOT NULL DEFAULT ARRAY[]::TIMESTAMP(3)[],
  "tick_lease_id" VARCHAR(32),
  "tick_lease_until" TIMESTAMP(3),
  "last_daily_scan_on" VARCHAR(10),
  "last_retention_on" VARCHAR(10),
  "reference_backfill_done_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billing_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_settings_singleton" CHECK ("id" = 'singleton'),
  CONSTRAINT "billing_settings_env_valid" CHECK ("provider_env" IN ('live','test'))
);

-- 5) billing_customers: the sealed PayNKolay customerKey per owner.
CREATE TABLE "billing_customers" (
  "user_id" TEXT NOT NULL,
  "provider" VARCHAR(16) NOT NULL DEFAULT 'paynkolay',
  "provider_env" VARCHAR(8) NOT NULL,
  "customer_key_enc" TEXT NOT NULL,
  "customer_key_fp" VARCHAR(40) NOT NULL,
  "last_listed_at" TIMESTAMP(3),
  "retention_notice_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "billing_customers_env_valid" CHECK ("provider_env" IN ('live','test')),
  -- defence in depth: a plaintext key can never be written
  CONSTRAINT "billing_customers_key_sealed" CHECK ("customer_key_enc" ~ '^cv1\.[0-9a-f]{8}\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{22}$'),
  CONSTRAINT "billing_customers_fp_format" CHECK ("customer_key_fp" ~ '^ckf1_[A-Za-z0-9_-]{32}$')
);
CREATE UNIQUE INDEX "billing_customers_customer_key_fp_key" ON "billing_customers"("customer_key_fp");
-- RESTRICT: account deletion must purge the provider cards first (or leave a tombstone).
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6) billing_cards: display-only mirror of PayNKolay's card list.
CREATE TABLE "billing_cards" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "handle" VARCHAR(25) NOT NULL,
  "last4" VARCHAR(4),
  "brand" VARCHAR(24),
  "issuer" VARCHAR(64),
  "card_type" VARCHAR(16),
  "exp_month" INTEGER,
  "exp_year" INTEGER,
  "alias" VARCHAR(32),
  "saved_by_payment_id" TEXT,
  "bound_consent_id" TEXT,
  "missing_since" TIMESTAMP(3),
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  "delete_reason" VARCHAR(24),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billing_cards_pkey" PRIMARY KEY ("id"),
  -- a full or partial PAN can never be stored by mistake
  CONSTRAINT "billing_cards_last4_digits" CHECK ("last4" IS NULL OR "last4" ~ '^[0-9]{4}$'),
  CONSTRAINT "billing_cards_handle_format" CHECK ("handle" ~ '^cd_[A-Za-z0-9_-]{22}$'),
  CONSTRAINT "billing_cards_no_pan_alias"  CHECK ("alias"     !~ '[0-9]{12,}'),
  CONSTRAINT "billing_cards_no_pan_issuer" CHECK ("issuer"    !~ '[0-9]{12,}'),
  CONSTRAINT "billing_cards_no_pan_brand"  CHECK ("brand"     !~ '[0-9]{12,}'),
  CONSTRAINT "billing_cards_no_pan_type"   CHECK ("card_type" !~ '[0-9]{12,}')
);
CREATE UNIQUE INDEX "billing_cards_handle_key" ON "billing_cards"("handle");
CREATE UNIQUE INDEX "billing_cards_bound_consent_id_key" ON "billing_cards"("bound_consent_id");
CREATE INDEX "billing_cards_user_id_deleted_at_idx" ON "billing_cards"("user_id", "deleted_at");
CREATE INDEX "billing_cards_deleted_at_idx" ON "billing_cards"("deleted_at");
ALTER TABLE "billing_cards" ADD CONSTRAINT "billing_cards_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7) billing_consents: append-only consent / mandate evidence.
CREATE TABLE "billing_consents" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "kind" VARCHAR(24) NOT NULL,
  "actor" VARCHAR(12) NOT NULL,
  "auth_method" VARCHAR(16),
  "reason" VARCHAR(40),
  "text_version" VARCHAR(32),
  "text_hash" VARCHAR(64),
  "text_rendered" TEXT,
  "terms" JSONB,
  "legal_doc_versions" JSONB,
  "locale" VARCHAR(2),
  "subscription_plan_id" TEXT,
  "billing_cycle" VARCHAR(8),
  "amount_minor" INTEGER,
  "card_id" TEXT,
  "payment_id" TEXT,
  "effective_at" TIMESTAMP(3),
  "confirmation_sent_at" TIMESTAMP(3),
  "ip_address" VARCHAR(45),
  "user_agent" VARCHAR(255),
  "ip_purge_after" TIMESTAMP(3),
  "ip_truncated_at" TIMESTAMP(3),
  "purge_after" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_consents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_consents_no_pan_ua" CHECK ("user_agent" !~ '[0-9]{12,}')
);
CREATE INDEX "billing_consents_user_id_created_at_idx" ON "billing_consents"("user_id", "created_at");
CREATE INDEX "billing_consents_ip_purge_after_idx" ON "billing_consents"("ip_purge_after");
CREATE INDEX "billing_consents_purge_after_idx" ON "billing_consents"("purge_after");

-- 8) billing_renewals: one row per (owner, period being renewed) — the
--    idempotency anchor of the renewal engine.
CREATE TABLE "billing_renewals" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider_env" VARCHAR(8) NOT NULL,
  "period_end" TIMESTAMP(3) NOT NULL,
  "subscription_plan_id" TEXT,
  "billing_cycle" VARCHAR(8) NOT NULL,
  "mode" VARCHAR(10) NOT NULL,
  "mode_reason" VARCHAR(32),
  "state" VARCHAR(24) NOT NULL DEFAULT 'scheduled',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "next_attempt_at" TIMESTAMP(3),
  "confirm_after" TIMESTAMP(3),
  "locked_until" TIMESTAMP(3),
  "lease_id" VARCHAR(32),
  "grace_ends_at" TIMESTAMP(3),
  "consent_id" TEXT,
  "charge_card_id" TEXT,
  "quoted_amount_minor" INTEGER,
  "notice_claimed_at" TIMESTAMP(3),
  "notice_delivered_at" TIMESTAMP(3),
  "notice_card_id" TEXT,
  "notice_failures" INTEGER NOT NULL DEFAULT 0,
  "announced_attempt_times" JSONB,
  "last_call_claimed_at" TIMESTAMP(3),
  "pending_mail" VARCHAR(24),
  "last_failure_code" VARCHAR(40),
  "last_failure_kind" VARCHAR(8),
  "owner_payment_id" TEXT,
  "owner_prev_state" VARCHAR(24),
  "cancel_requested_at" TIMESTAMP(3),
  "cancel_reason" VARCHAR(32),
  "manual_review_at" TIMESTAMP(3),
  "succeeded_payment_id" TEXT,
  "dunning_step" INTEGER NOT NULL DEFAULT 0,
  "dry_run_counted_at" TIMESTAMP(3),
  "ended_at" TIMESTAMP(3),
  "end_reason" VARCHAR(32),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billing_renewals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_renewals_attempts_bound" CHECK ("attempts" >= 0 AND "attempts" <= "max_attempts"),
  CONSTRAINT "billing_renewals_env_valid" CHECK ("provider_env" IN ('live','test')),
  CONSTRAINT "billing_renewals_mode_valid" CHECK ("mode" IN ('auto','reminder')),
  CONSTRAINT "billing_renewals_state_valid" CHECK ("state" IN ('scheduled','owner_paying','charging','awaiting_confirmation',
    'retry_wait','needs_action','manual_review','succeeded','lapsed','canceled'))
);
CREATE UNIQUE INDEX "billing_renewals_user_id_period_end_key" ON "billing_renewals"("user_id", "period_end");
CREATE UNIQUE INDEX "billing_renewals_succeeded_payment_id_key" ON "billing_renewals"("succeeded_payment_id");
CREATE INDEX "billing_renewals_state_next_attempt_at_idx" ON "billing_renewals"("state", "next_attempt_at");
CREATE INDEX "billing_renewals_state_confirm_after_idx" ON "billing_renewals"("state", "confirm_after");

-- 9) billing_vault_tombstones: provider-side card deletion still owed after
--    an account was erased (verbatim copy of the sealed key).
CREATE TABLE "billing_vault_tombstones" (
  "id" TEXT NOT NULL,
  "provider_env" VARCHAR(8) NOT NULL,
  "customer_key_enc" TEXT NOT NULL,
  "aad_user_id" TEXT NOT NULL,
  "state" VARCHAR(8) NOT NULL DEFAULT 'open',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_error" VARCHAR(40),
  "manual_since" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_vault_tombstones_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_vault_tombstones_key_sealed" CHECK ("customer_key_enc" ~ '^cv1\.[0-9a-f]{8}\.'),
  CONSTRAINT "billing_vault_tombstones_state_valid" CHECK ("state" IN ('open','manual')),
  CONSTRAINT "billing_vault_tombstones_env_valid" CHECK ("provider_env" IN ('live','test'))
);
CREATE INDEX "billing_vault_tombstones_state_next_attempt_at_idx" ON "billing_vault_tombstones"("state", "next_attempt_at");
