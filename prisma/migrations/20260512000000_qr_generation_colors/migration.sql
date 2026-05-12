-- Stage 96 — QR colour persistence for QrGeneration rows.
-- Owner picks custom dark/light colours when generating a QR; subsequent
-- downloads (PNG/SVG) honour the same pair via /api/restaurants/[id]/qr
-- so re-rendering a saved QR stays visually identical to the first preview.
--
-- Both columns nullable. NULL = use platform defaults (black on white).
-- Safe to roll forward on existing rows; no backfill needed.

ALTER TABLE "qr_generations"
  ADD COLUMN "dark_color" TEXT,
  ADD COLUMN "light_color" TEXT;
