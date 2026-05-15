-- Wave B4 (CLAUDE.md §38.B + §38.193) — owner-initiated account deletion
-- with a 30-day grace window + cancel-by-token. Both fields default null
-- (no scheduled deletion); they get cleared together on cancel OR when the
-- /api/cron/process-scheduled-deletions cron completes the cascade wipe.
ALTER TABLE "users"
  ADD COLUMN "scheduled_deletion_at" TIMESTAMP(3),
  ADD COLUMN "deletion_cancel_token" TEXT;

-- Unique on the cancel token so the inbound /api/account/delete/cancel
-- handler can look the user up by token alone (random 32-byte hex = 64
-- chars; collision odds astronomical, but unique enforces the contract).
CREATE UNIQUE INDEX "users_deletion_cancel_token_key"
  ON "users"("deletion_cancel_token");
