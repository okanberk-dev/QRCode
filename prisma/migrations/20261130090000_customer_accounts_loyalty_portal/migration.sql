-- Customer accounts, member first/last name and the business-edited customer
-- panel (CLAUDE.md §61).
ALTER TABLE "loyalty_members" ADD COLUMN     "customer_account_id" TEXT,
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "last_name" TEXT;

ALTER TABLE "loyalty_programs" ADD COLUMN     "portal" JSONB;

-- CreateTable
CREATE TABLE "customer_accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "google_uid" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "birth_month" INTEGER,
    "birth_day" INTEGER,
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "email_verified_at" TIMESTAMP(3),
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_accounts_email_key" ON "customer_accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customer_accounts_google_uid_key" ON "customer_accounts"("google_uid");

-- CreateIndex
CREATE INDEX "loyalty_members_customer_account_id_idx" ON "loyalty_members"("customer_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_members_program_id_customer_account_id_key" ON "loyalty_members"("program_id", "customer_account_id");

-- AddForeignKey
ALTER TABLE "loyalty_members" ADD CONSTRAINT "loyalty_members_customer_account_id_fkey" FOREIGN KEY ("customer_account_id") REFERENCES "customer_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Existing cards: split the stored full name into first / last name.
UPDATE "loyalty_members"
SET "first_name" = split_part(btrim("name"), ' ', 1),
    "last_name" = NULLIF(btrim(substr(btrim("name"), length(split_part(btrim("name"), ' ', 1)) + 1)), '')
WHERE "name" IS NOT NULL AND "first_name" IS NULL;
