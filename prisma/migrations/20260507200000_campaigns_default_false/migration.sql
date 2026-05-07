-- Stage 30 §38.106 — Campaign feature tier gate (admin entitlement model).
--
-- Default `campaigns_enabled` true → false. Yeni restoranlar default OFF;
-- admin /admin/restaurants/[id] feature-access endpoint'inden manuel
-- enable eder (kullanıcı talebi: "adminin tanımladığı kullanıcılar
-- kullanabilsinler").
--
-- Mevcut tüm `campaigns_enabled = true` row'ları false'a çekilir — admin
-- per-restaurant manuel enable etmedikçe owner panel'de feature locked
-- görünür (CampaignsLocked screen + sidebar lock badge). Backward
-- incompatible; production deploy sonrası mevcut beta user'lar için
-- admin manuel enable adımı gerekir.
--
-- Backfill query atomic; UPDATE before ALTER COLUMN — ALTER yalnız
-- DEFAULT değiştirir, mevcut data ile çakışmaz.

-- 1) Mevcut tüm satırları false yap (backfill — admin entitled olmayan
--    tüm restoranlar default lock'a düşer).
UPDATE "restaurants" SET "campaigns_enabled" = false WHERE "campaigns_enabled" = true;

-- 2) Default değer `true` → `false` (yeni insert'ler için).
ALTER TABLE "restaurants" ALTER COLUMN "campaigns_enabled" SET DEFAULT false;
