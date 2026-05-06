-- CLAUDE.md §38.98 — Owner panel campaigns feature master flag.
-- Default TRUE (opt-out semantic): existing owners keep access to campaigns
-- functionality. Admin can disable per-restaurant via:
--   PATCH /api/admin/restaurants/[id]/feature-access (single)
--   POST /api/admin/restaurants/bulk action='feature_override' (bulk, §38.97)
-- Owner UI: /dashboard/campaigns (placeholder → full UI in §38.99).
-- Owner endpoints (PR-2 §38.99): /api/customer-campaigns/* gate on this flag.

ALTER TABLE "restaurants"
  ADD COLUMN "campaigns_enabled" BOOLEAN NOT NULL DEFAULT TRUE;
