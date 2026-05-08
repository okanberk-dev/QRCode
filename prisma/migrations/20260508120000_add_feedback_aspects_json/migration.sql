-- §38.130 Stage 49 — public review surface tag chip picker
-- 10 sabit aspect (Yemek tadı / Servis hızı / Sıcaklık / Porsiyon /
-- Fiyat / Temizlik / Atmosfer / Personel ilgisi / Müzik / Bekleme).
-- String array JSONB serialize edilir; whitelist server-side enforced
-- (POST /api/feedback). Backward compat: nullable + default null
-- (mevcut feedback rows etkilenmez).

ALTER TABLE "feedback" ADD COLUMN "aspects_json" JSONB;
