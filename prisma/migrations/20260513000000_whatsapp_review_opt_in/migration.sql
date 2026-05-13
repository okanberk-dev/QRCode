-- Stage 97 — WhatsApp on low-rating review opt-in.
-- Owner can surface a "Message us on WhatsApp" button on the public
-- review surface (`/r/[slug]`) thanks step for customers who rate 1–3★.
--
-- `whatsapp_review_enabled` is the master toggle (default OFF — existing
-- workspaces are unaffected). `whatsapp_review_message` is an optional
-- pre-filled WhatsApp deep-link `?text=` template; NULL falls back to
-- the locale-aware system default in src/lib/whatsapp.ts.
--
-- Both columns additive; safe to roll forward on existing rows; no
-- backfill needed (KVKK-clean opt-in default).

ALTER TABLE "restaurants"
  ADD COLUMN "whatsapp_review_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "whatsapp_review_message" TEXT;
