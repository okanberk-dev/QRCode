-- §38.52 — Yelp + Foursquare yorum platformları (hibrit taksonomi).
-- Restaurant model'e 4 yeni nullable field. Tasarım PagePlatforms 12 platform
-- listesinden Yelp + Foursquare eklendi (kullanıcı kararı: review-odaklı
-- Buaze paterniyle, Zapier/HubSpot/Mailchimp skip).
--
-- Default behavior:
--   - URL null = "Henüz bağlanmadı" (UI fallback)
--   - enabled true (default) — URL set edilince aktif görünür; URL boşsa UI
--     yine "Henüz bağlanmadı" gösterir (enabled = URL_var AND flag=true türetilir)

ALTER TABLE "restaurants"
ADD COLUMN "yelp_url" TEXT,
ADD COLUMN "foursquare_url" TEXT,
ADD COLUMN "yelp_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "foursquare_enabled" BOOLEAN NOT NULL DEFAULT true;
