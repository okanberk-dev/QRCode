-- Loyalty: chain branches, card notifications (Web Push), win-back e-mail (CLAUDE.md §61).
-- Additive only: new tables + nullable / defaulted columns.

ALTER TABLE "loyalty_programs"
  ADD COLUMN "winback_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "winback_days" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "winback_message" TEXT,
  ADD COLUMN "winback_confirmed_at" TIMESTAMP(3);

ALTER TABLE "loyalty_members"
  ADD COLUMN "marketing_consent_at" TIMESTAMP(3),
  ADD COLUMN "marketing_opt_out_at" TIMESTAMP(3),
  ADD COLUMN "winback_sent_at" TIMESTAMP(3),
  ADD COLUMN "birthday_notice_year" INTEGER;

-- Existing opt-ins: the consent was given when the card was opened.
UPDATE "loyalty_members" SET "marketing_consent_at" = "created_at" WHERE "marketing_consent" = true;

ALTER TABLE "loyalty_events" ADD COLUMN "restaurant_id" TEXT;

CREATE TABLE "loyalty_program_branches" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loyalty_program_branches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "loyalty_program_branches_restaurant_id_key" ON "loyalty_program_branches"("restaurant_id");
CREATE INDEX "loyalty_program_branches_program_id_idx" ON "loyalty_program_branches"("program_id");
ALTER TABLE "loyalty_program_branches" ADD CONSTRAINT "loyalty_program_branches_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "loyalty_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_program_branches" ADD CONSTRAINT "loyalty_program_branches_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "loyalty_push_subscriptions" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sent_at" TIMESTAMP(3),
    CONSTRAINT "loyalty_push_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "loyalty_push_subscriptions_member_id_endpoint_key" ON "loyalty_push_subscriptions"("member_id", "endpoint");
CREATE INDEX "loyalty_push_subscriptions_endpoint_idx" ON "loyalty_push_subscriptions"("endpoint");
ALTER TABLE "loyalty_push_subscriptions" ADD CONSTRAINT "loyalty_push_subscriptions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "loyalty_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
