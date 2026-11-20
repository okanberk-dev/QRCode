-- GATED MIGRATION — not applied from this folder.
--
-- `prisma migrate deploy` (part of `npm run build`) reads only prisma/migrations.
-- This CHECK makes a raw PayNKolay REFERENCE_CODE impossible to store (billing
-- spec §4.3, D7). It must not ship in the same deploy as the saved-cards
-- foundation, because the settle code that runs before that release still
-- writes raw references, and existing rows hold raw values until the
-- back-fill has run. Move this folder into prisma/migrations (keep the
-- name) in a separate deploy, after gate G0:
--   1. the release that writes only `rf1_…` / `paynkolay:<id>` is live;
--   2. `scripts/billing-bind-env.ts --env live` has bound the database;
--   3. `scripts/backfill-reference-fingerprints.ts` reported remaining 0 and
--      set billing_settings.reference_backfill_done_at.
--
-- Guard: on a database that has PayNKolay references but no back-fill
-- marker, this migration stops with an error instead of breaking settlement.
-- Fresh databases (no references) pass. If VALIDATE fails, a raw value
-- slipped in: re-run the back-fill; the NOT VALID part already protects new
-- writes.

DO $$
BEGIN
  IF (
    EXISTS (SELECT 1 FROM "billing_payments" WHERE "reference_code" IS NOT NULL)
    OR EXISTS (SELECT 1 FROM "billing_invoices" WHERE "source" = 'paynkolay' AND "provider_ref" IS NOT NULL)
  ) AND NOT EXISTS (
    SELECT 1 FROM "billing_settings" WHERE "id" = 'singleton' AND "reference_backfill_done_at" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'billing reference back-fill has not run: run scripts/backfill-reference-fingerprints.ts first (gate G0)';
  END IF;
END $$;

ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_reference_fingerprinted"
  CHECK ("reference_code" IS NULL OR "reference_code" ~ '^(rf1_[A-Za-z0-9_-]{22}|paynkolay:[A-Za-z0-9_-]{1,64})$') NOT VALID;
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_provider_ref_fingerprinted"
  CHECK ("source" <> 'paynkolay' OR "provider_ref" IS NULL OR "provider_ref" ~ '^(rf1_[A-Za-z0-9_-]{22}|paynkolay:[A-Za-z0-9_-]{1,64})$') NOT VALID;
ALTER TABLE "billing_payments" VALIDATE CONSTRAINT "billing_payments_reference_fingerprinted";
ALTER TABLE "billing_invoices" VALIDATE CONSTRAINT "billing_invoices_provider_ref_fingerprinted";
