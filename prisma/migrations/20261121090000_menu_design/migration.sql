-- Menu design presets + knobs + cover. Additive and nullable: NULL = the legacy
-- look of menu_theme, so existing restaurants need no action.
ALTER TABLE "restaurants" ADD COLUMN "menu_design" JSONB;
ALTER TABLE "restaurants" ADD COLUMN "menu_cover_url" TEXT;
ALTER TABLE "restaurants" ADD COLUMN "menu_cover_version" TEXT;

-- Expand legacy #RGB accents to uppercase #RRGGBB (isValidHexColor accepted #RGB and
-- several routes stored it as-is). Produces values old code already accepts.
UPDATE "restaurants"
SET "menu_accent_color" = upper('#' || repeat(substr("menu_accent_color", 2, 1), 2)
                                    || repeat(substr("menu_accent_color", 3, 1), 2)
                                    || repeat(substr("menu_accent_color", 4, 1), 2))
WHERE "menu_accent_color" ~ '^#[0-9A-Fa-f]{3}$';
