-- Dodo Payments webhook idempotency log (audit §38.B H2).
-- Additive only: new table, no changes to existing rows.
CREATE TABLE "dodo_webhook_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dodo_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dodo_webhook_events_event_id_key" ON "dodo_webhook_events"("event_id");
