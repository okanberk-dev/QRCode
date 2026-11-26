-- Loyalty card module (CLAUDE.md §60): one stamp / points program per
-- business, its rewards, members (cards) and balance events.
-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "loyalty_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "loyalty_programs" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'stamps',
    "points_per_visit" INTEGER NOT NULL DEFAULT 0,
    "points_per_spend" INTEGER NOT NULL DEFAULT 0,
    "spend_step" INTEGER NOT NULL DEFAULT 0,
    "welcome_bonus" INTEGER NOT NULL DEFAULT 0,
    "visit_cooldown_minutes" INTEGER NOT NULL DEFAULT 60,
    "expiry_days" INTEGER,
    "birthday_reward" TEXT,
    "tiers" JSONB,
    "accent_color" TEXT,
    "terms" TEXT,
    "template" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_rewards" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cost" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_members" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "card_token" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "birth_month" INTEGER,
    "birth_day" INTEGER,
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetime_earned" INTEGER NOT NULL DEFAULT 0,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "rewards_redeemed" INTEGER NOT NULL DEFAULT 0,
    "last_visit_at" TIMESTAMP(3),
    "last_birthday_reward_year" INTEGER,
    "joined_via" TEXT NOT NULL DEFAULT 'qr',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_events" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "visit" BOOLEAN NOT NULL DEFAULT false,
    "spend" INTEGER,
    "reward_id" TEXT,
    "reward_title" TEXT,
    "note" TEXT,
    "actor_id" TEXT,
    "actor_source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_programs_restaurant_id_key" ON "loyalty_programs"("restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_programs_slug_key" ON "loyalty_programs"("slug");

-- CreateIndex
CREATE INDEX "loyalty_rewards_program_id_sort_order_idx" ON "loyalty_rewards"("program_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_members_card_token_key" ON "loyalty_members"("card_token");

-- CreateIndex
CREATE INDEX "loyalty_members_program_id_last_visit_at_idx" ON "loyalty_members"("program_id", "last_visit_at");

-- CreateIndex
CREATE INDEX "loyalty_members_program_id_created_at_idx" ON "loyalty_members"("program_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_members_program_id_code_key" ON "loyalty_members"("program_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_members_program_id_phone_key" ON "loyalty_members"("program_id", "phone");

-- CreateIndex
CREATE INDEX "loyalty_events_program_id_created_at_idx" ON "loyalty_events"("program_id", "created_at");

-- CreateIndex
CREATE INDEX "loyalty_events_member_id_created_at_idx" ON "loyalty_events"("member_id", "created_at");

-- AddForeignKey
ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_rewards" ADD CONSTRAINT "loyalty_rewards_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "loyalty_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_members" ADD CONSTRAINT "loyalty_members_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "loyalty_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_events" ADD CONSTRAINT "loyalty_events_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "loyalty_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_events" ADD CONSTRAINT "loyalty_events_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "loyalty_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Plan modules (§5.2): the loyalty card is a Growth and Scale module. Plans
-- that already manage modules and include the digital menu get it, so
-- applying a plan never switches the new card off for their owners.
UPDATE "subscription_plans"
SET "module_keys" = array_append("module_keys", 'loyalty')
WHERE "modules_managed" = TRUE
  AND 'menu' = ANY("module_keys")
  AND NOT ('loyalty' = ANY("module_keys"));

-- Growth plan card bullet (src/lib/plan-catalog.ts).
UPDATE "subscription_plans"
SET "features_tr" = "features_tr" || '["Dijital sadakat kartı (damga veya puan)"]'::JSONB,
    "features_en" = "features_en" || '["Digital loyalty card (stamps or points)"]'::JSONB
WHERE lower("nameEn") = 'growth'
  AND jsonb_typeof("features_tr") = 'array'
  AND jsonb_typeof("features_en") = 'array'
  AND NOT ("features_tr" @> '["Dijital sadakat kartı (damga veya puan)"]'::JSONB);
