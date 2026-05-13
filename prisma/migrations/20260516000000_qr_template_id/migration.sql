-- QR template_id field for Buaze QR Template Kit (Wave A).
-- Nullable + no default — legacy rows + cron-generated QRs stay NULL;
-- new wizard flow writes `classic` / `table_tent` / etc. via registry.
-- Source: src/components/panel/qr/templates/registry.ts
ALTER TABLE "qr_generations" ADD COLUMN "template_id" TEXT;
