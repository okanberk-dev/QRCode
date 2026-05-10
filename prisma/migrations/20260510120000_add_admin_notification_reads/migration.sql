-- Admin notification per-admin read receipts for broadcast rows.
-- Broadcast notifications (`admin_notifications.admin_id IS NULL`) are shared;
-- this table stores each admin's own read state without mutating the shared row.

CREATE TABLE "admin_notification_reads" (
  "notification_id" TEXT NOT NULL,
  "admin_id" TEXT NOT NULL,
  "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_notification_reads_pkey" PRIMARY KEY ("notification_id", "admin_id")
);

CREATE INDEX "admin_notification_reads_admin_id_read_at_idx"
  ON "admin_notification_reads" ("admin_id", "read_at");

ALTER TABLE "admin_notification_reads"
  ADD CONSTRAINT "admin_notification_reads_notification_id_fkey"
  FOREIGN KEY ("notification_id") REFERENCES "admin_notifications"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_notification_reads"
  ADD CONSTRAINT "admin_notification_reads_admin_id_fkey"
  FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve legacy global-read broadcasts as read for existing admins. The old
-- model could not know which admin read the broadcast, so it had already made
-- that state global; this backfill keeps deployed data behavior stable.
INSERT INTO "admin_notification_reads" ("notification_id", "admin_id", "read_at")
SELECT n."id", a."id", n."read_at"
FROM "admin_notifications" n
CROSS JOIN "admin_users" a
WHERE n."admin_id" IS NULL
  AND n."read_at" IS NOT NULL
ON CONFLICT ("notification_id", "admin_id") DO NOTHING;
