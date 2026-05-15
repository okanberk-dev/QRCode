-- Wave F (CLAUDE.md §38.B + §38.196) — mail delivery audit log table.
-- Every outbound mail (Resend HTTP layer) writes a row for KVKK §13
-- forensic recovery + post-incident "did this owner get the alert?"
-- queries. 2-year retention; pruning cron deferred to a follow-up PR.

CREATE TABLE "mail_delivery_logs" (
    "id" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "locale" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_delivery_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mail_delivery_logs_template_created_at_idx"
  ON "mail_delivery_logs"("template", "created_at");
CREATE INDEX "mail_delivery_logs_recipient_created_at_idx"
  ON "mail_delivery_logs"("recipient", "created_at");
CREATE INDEX "mail_delivery_logs_status_created_at_idx"
  ON "mail_delivery_logs"("status", "created_at");
