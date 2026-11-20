-- Buaze is operated by NEXTGEN YAZILIM EĞİTİM İNŞAAT SANAYİ VE TİCARET
-- LİMİTED ŞİRKETİ, the same company that runs L'Affogato (owner decision,
-- 2026-11-20). Every contract (kullanım sözleşmesi, mesafeli hizmet
-- sözleşmesi, KVKK aydınlatma, veri işleyen sözleşmesi), the site footer and
-- the Organization JSON-LD read these legal-text variables, so they are set
-- here once. The values are public registry facts from the tax certificate
-- (src/lib/legal/company-entity.ts holds the same facts as code defaults).
-- Existing rows are overwritten on purpose: the earlier values were the
-- plain brand name or "[...]" placeholders.
INSERT INTO "legal_variables" ("key", "value", "updated_at") VALUES
  ('COMPANY_NAME', 'NEXTGEN YAZILIM EĞİTİM İNŞAAT SANAYİ VE TİCARET LİMİTED ŞİRKETİ', CURRENT_TIMESTAMP),
  ('COMPANY_ADDRESS', 'Postane Mah. Atatürk Cad. No: 28 İç Kapı No: 1, 34940 Tuzla / İstanbul', CURRENT_TIMESTAMP),
  ('COMPANY_TAX_ID', 'MERSİS 0734069467300012 · Tuzla Vergi Dairesi 6312110904', CURRENT_TIMESTAMP),
  ('COMPANY_PHONE', '+90 536 429 09 19', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE
  SET "value" = EXCLUDED."value",
      "updated_at" = CURRENT_TIMESTAMP;
