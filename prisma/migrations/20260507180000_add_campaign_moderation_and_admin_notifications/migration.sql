-- Stage 29 §38.105 — Campaign moderation pipeline + admin notification feed.
--
-- 1) `customer_email_campaigns` extends with moderation timeline + reviewer note
--    All new fields nullable + default null → backward compatible
--    (existing draft/sending/sent/failed rows untouched). Status string column
--    intact; new literals (`pending_approval | approved | rejected`) Zod-side.
--
-- 2) New `admin_notifications` table = in-app feed for admin topbar bell
--    (CLAUDE.md §38.100 paterni paralel — 60s polling + visibilitychange + mark-
--    as-read). adminId nullable → broadcast pattern; payload Json holds
--    campaign metadata for click-through.
--
-- Migration is additive — no data loss, no breaking column drops.

-- 1. CustomerEmailCampaign — moderation fields (all nullable)
ALTER TABLE "customer_email_campaigns"
  ADD COLUMN "submitted_at" TIMESTAMP(3),
  ADD COLUMN "approved_by_id" TEXT,
  ADD COLUMN "approved_at" TIMESTAMP(3),
  ADD COLUMN "rejected_by_id" TEXT,
  ADD COLUMN "rejected_at" TIMESTAMP(3),
  ADD COLUMN "reviewer_note" TEXT;

-- Admin queue paginate hot path: WHERE status='pending_approval' ORDER BY submitted_at DESC
CREATE INDEX "customer_email_campaigns_status_submitted_at_idx"
  ON "customer_email_campaigns" ("status", "submitted_at");

-- 2. AdminNotification table
CREATE TABLE "admin_notifications" (
  "id" TEXT NOT NULL,
  "admin_id" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "payload" JSONB,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

-- Per-admin feed (with broadcast adminId IS NULL also matched in query) +
-- chronological + unread filter
CREATE INDEX "admin_notifications_admin_id_read_at_created_at_idx"
  ON "admin_notifications" ("admin_id", "read_at", "created_at");

-- Admin filter + analytics by event type
CREATE INDEX "admin_notifications_type_created_at_idx"
  ON "admin_notifications" ("type", "created_at");

-- Cascade: AdminUser silinince per-admin notifications temizlenir; broadcast
-- (admin_id IS NULL) korunur
ALTER TABLE "admin_notifications"
  ADD CONSTRAINT "admin_notifications_admin_id_fkey"
  FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
