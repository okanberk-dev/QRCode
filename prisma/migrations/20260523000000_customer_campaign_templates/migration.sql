-- Stage 119 §38.199 — Reusable campaign templates (sector-aware, locale-aware).
-- CustomerEmailCampaign pre-fill catalog. AuditTemplate fork paterni reuse:
-- restaurantId=null + isPublished=true = global Buaze catalog (admin manages);
-- restaurantId set = owner's own saved template (forked from global, optional).

CREATE TABLE "customer_campaign_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sector" TEXT NOT NULL DEFAULT 'other',
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "category" TEXT NOT NULL DEFAULT 'custom',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "restaurant_id" TEXT,
    "forked_from_id" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_campaign_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_campaign_templates_key_key" ON "customer_campaign_templates"("key");
CREATE INDEX "customer_campaign_templates_sector_locale_is_published_idx" ON "customer_campaign_templates"("sector", "locale", "is_published");
CREATE INDEX "customer_campaign_templates_restaurant_id_sector_locale_idx" ON "customer_campaign_templates"("restaurant_id", "sector", "locale");
CREATE INDEX "customer_campaign_templates_forked_from_id_idx" ON "customer_campaign_templates"("forked_from_id");

ALTER TABLE "customer_campaign_templates" ADD CONSTRAINT "customer_campaign_templates_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_campaign_templates" ADD CONSTRAINT "customer_campaign_templates_forked_from_id_fkey" FOREIGN KEY ("forked_from_id") REFERENCES "customer_campaign_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
