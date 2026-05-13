-- Stage 99 — Survey coupon code (design handoff a/nFAGytnqZwW98Ldy0d5Lig).
-- Adds optional couponCode + couponLabel fields to surveys so the public
-- thanks screen can render the "Sana özel kupon" card from the design.
--
-- Both nullable + safe-additive; existing rows render the thanks screen
-- without the coupon card (default behaviour intact).

ALTER TABLE "surveys"
  ADD COLUMN "coupon_code" TEXT,
  ADD COLUMN "coupon_label" TEXT;
