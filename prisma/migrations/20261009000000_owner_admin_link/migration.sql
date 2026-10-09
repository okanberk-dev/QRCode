-- Owner ↔ admin panel link (2026-10).
-- Additive only: both columns carry defaults, existing rows keep behaviour.

-- Admin master switch for the owner Surveys module (default ON = no change
-- for owners already using surveys).
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "surveys_enabled" BOOLEAN NOT NULL DEFAULT true;

-- Marks an admin-initiated pause so the owner cannot silently re-activate.
-- Backfill: restaurants that are currently inactive were paused either by an
-- admin or by the owner; we cannot tell which, so we leave them unflagged
-- (owner keeps the ability to re-activate their own pause).
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "suspended_by_admin" BOOLEAN NOT NULL DEFAULT false;
