-- Saved cards (billing spec §3.3): the per-IP failed hosted payment cap is counted in the database.
-- A hosted payment stores an HMAC fingerprint of the trusted client IP ("ip1_" + 22 base64url chars,
-- BILLING_HMAC_KEY), never the IP itself; retention nulls it after 2 days. Additive and nullable:
-- existing rows and older application versions are unaffected.

-- AlterTable
ALTER TABLE "billing_payments" ADD COLUMN "client_ip_fp" VARCHAR(32);

-- Only the fingerprint shape can be stored (a raw IP or any other value is rejected).
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_client_ip_fp_chk"
  CHECK ("client_ip_fp" IS NULL OR "client_ip_fp" ~ '^ip1_[A-Za-z0-9_-]{22}$');

-- CreateIndex
CREATE INDEX "billing_payments_client_ip_fp_created_at_idx" ON "billing_payments"("client_ip_fp", "created_at");
