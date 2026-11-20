-- Saved cards + auto-renew, review follow-up (billing spec §3.2, §11.7). Additive only:
-- one nullable column and extra CHECK constraints on tables created by
-- 20261120000000_billing_saved_cards_auto_renew.

-- 1) Refund queue: what the operator must refund when PayNKolay charged one
--    clientRefCode more than once (NULL = one charge of amount_minor).
ALTER TABLE "billing_payments" ADD COLUMN "refund_amount_minor" INTEGER;
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_refund_amount_positive"
  CHECK ("refund_amount_minor" IS NULL OR "refund_amount_minor" > 0) NOT VALID;
ALTER TABLE "billing_payments" VALIDATE CONSTRAINT "billing_payments_refund_amount_positive";

-- 2) PAN guards also catch a full PAN written with separators ("4111 1111 1111 1111",
--    "4111-1111-1111-1111", "4111.1111.1111.1111"): 12+ digits with at most one
--    space, dot or dash between them. The card display columns never hold such a run.
ALTER TABLE "billing_cards" ADD CONSTRAINT "billing_cards_no_pan_grouped_alias"
  CHECK ("alias" !~ '[0-9]([ .-]?[0-9]){11,}') NOT VALID;
ALTER TABLE "billing_cards" ADD CONSTRAINT "billing_cards_no_pan_grouped_issuer"
  CHECK ("issuer" !~ '[0-9]([ .-]?[0-9]){11,}') NOT VALID;
ALTER TABLE "billing_cards" ADD CONSTRAINT "billing_cards_no_pan_grouped_brand"
  CHECK ("brand" !~ '[0-9]([ .-]?[0-9]){11,}') NOT VALID;
ALTER TABLE "billing_cards" ADD CONSTRAINT "billing_cards_no_pan_grouped_type"
  CHECK ("card_type" !~ '[0-9]([ .-]?[0-9]){11,}') NOT VALID;
ALTER TABLE "billing_cards" VALIDATE CONSTRAINT "billing_cards_no_pan_grouped_alias";
ALTER TABLE "billing_cards" VALIDATE CONSTRAINT "billing_cards_no_pan_grouped_issuer";
ALTER TABLE "billing_cards" VALIDATE CONSTRAINT "billing_cards_no_pan_grouped_brand";
ALTER TABLE "billing_cards" VALIDATE CONSTRAINT "billing_cards_no_pan_grouped_type";

-- The user agent keeps dotted version numbers ("Chrome/131.0.6778.204"), so dots are
-- not separators here; spaces and dashes are. The app strips the same pattern first.
ALTER TABLE "billing_consents" ADD CONSTRAINT "billing_consents_no_pan_grouped_ua"
  CHECK ("user_agent" !~ '[0-9]([ -]?[0-9]){11,}') NOT VALID;
ALTER TABLE "billing_consents" VALIDATE CONSTRAINT "billing_consents_no_pan_grouped_ua";
