-- Owner-configurable public-platform threshold.
-- Default 5: only 5-star customers are offered the public review platform;
-- 1-4 stars land in the business's own feedback form first.
-- Additive + NOT NULL with a default, so existing rows backfill safely
-- (CLAUDE.md §21.18 preview-deploy safety).
ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "redirect_min_rating" INTEGER NOT NULL DEFAULT 5;
