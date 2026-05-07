-- Stage 31b §38.108 — Legal compliance extension (Türk hukuku + GDPR).
--
-- 1) `restaurants` extends with sender identity fields (ETK m.5 zorunluluğu)
--    - business_id_number: VKN/TCKN — gerçek/tüzel kişi vergi/kimlik no
--    - mersis_number: Mersis (Merkezi Sicil Kayıt Sistemi) 16-digit no
--    - physical_address: ETK m.5(1)(a) iletişim bilgisi + TKHK m.4 fiziki adres
--
-- 2) `customer_email_campaigns` extends with İYS (İleti Yönetim Sistemi)
--    tracking fields. Operatör İYS API credentials sağlandığında
--    `src/lib/legal/iys.ts:reportToIys` helper'ı bu alanları doldurur.
--    Mail footer'da Stage 31c PR3 enrichment ile render edilir.
--    - iys_id: İYS gönderim takip UUID
--    - iys_channel_code: 'E_MARKETING' | 'SMS' | 'CALL' (İYS kanal kodu)
--
-- All new fields nullable + default null — backward compatible
-- (existing rows untouched, breaking change yok). Vercel build script
-- `prisma migrate deploy` otomatik apply (CLAUDE.md §14.1).

-- 1. Restaurant — sender identity fields (ETK m.5 + TKHK m.4)
ALTER TABLE "restaurants"
  ADD COLUMN "business_id_number" TEXT,
  ADD COLUMN "mersis_number" TEXT,
  ADD COLUMN "physical_address" TEXT;

-- 2. CustomerEmailCampaign — İYS tracking placeholder
ALTER TABLE "customer_email_campaigns"
  ADD COLUMN "iys_id" TEXT,
  ADD COLUMN "iys_channel_code" TEXT;
