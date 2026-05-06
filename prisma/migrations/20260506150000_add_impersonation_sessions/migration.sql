-- Stage A4 §38.96 — admin impersonation sessions (support workflow).
-- KVKK + audit + auto-timeout disipline: 30dk window, mandatory reason,
-- cron expire, two-sided cascade onDelete.

CREATE TABLE "impersonation_sessions" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "ended_reason" TEXT,

    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "impersonation_sessions_admin_id_started_at_idx"
  ON "impersonation_sessions"("admin_id", "started_at");

CREATE INDEX "impersonation_sessions_target_user_id_started_at_idx"
  ON "impersonation_sessions"("target_user_id", "started_at");

-- Active session lookup için (cron + auth check):
CREATE INDEX "impersonation_sessions_ended_at_ends_at_idx"
  ON "impersonation_sessions"("ended_at", "ends_at");

ALTER TABLE "impersonation_sessions"
  ADD CONSTRAINT "impersonation_sessions_admin_id_fkey"
  FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "impersonation_sessions"
  ADD CONSTRAINT "impersonation_sessions_target_user_id_fkey"
  FOREIGN KEY ("target_user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
