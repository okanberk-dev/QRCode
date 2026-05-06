-- Stage 12 §38.82 — AutomationRule fire telemetry
-- 3 nullable field: lastFiredAt + lastFireStatus + lastFireResponseMs.
-- Owner panel tablo "Son tetik 2sa önce · 200 OK · 340ms" rozet için cheap query.
-- Alternative: AdminAuditLog raw `payload->>'ruleId'` scan — Postgres index'siz pahalı.
-- 3 alan nullable, eski satırlar etkilenmez, breaking change yok.
-- Index eklenmedi: list endpoint userId index'ini kullanıyor, lastFiredAt sadece display.

ALTER TABLE "automation_rules" ADD COLUMN "last_fired_at" TIMESTAMP(3);
ALTER TABLE "automation_rules" ADD COLUMN "last_fire_status" TEXT;
ALTER TABLE "automation_rules" ADD COLUMN "last_fire_response_ms" INTEGER;
