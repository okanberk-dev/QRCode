-- §38.37 — Hesabım profile genişletme. User modeline 2 nullable field:
-- position (işletme içi rol — "Operasyon müdürü", "Sahip" vb.)
-- timezone (IANA tz string — "Europe/Istanbul"). Locale field'ından farklı
-- (locale = dil, timezone = tarih/saat formatı). Defansif: nullable + default
-- yok, eski rows null kalır, breaking change yok.
ALTER TABLE "users" ADD COLUMN "position" TEXT;
ALTER TABLE "users" ADD COLUMN "timezone" TEXT;
