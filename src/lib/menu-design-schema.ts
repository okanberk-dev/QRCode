// Write-side validation for the menu design (menu-design-final.md §7.2).
//
// Zod lives here, NOT in menu-design.ts: this module is imported only by API
// routes and tests, never by client code, so zod stays out of the public menu
// and Studio bundles. Owners can only send enumerated values, a `#RRGGBB`
// colour (normalised) and one sanitised plain-text tagline — never CSS or HTML.

import { z } from 'zod';
import { normaliseHex } from './qr-colors';
import {
  MENU_BADGE_STYLES,
  MENU_CARD_STYLES,
  MENU_CORNERS,
  MENU_DENSITIES,
  MENU_HEADERS,
  MENU_ITEM_LAYOUTS,
  MENU_NAVS,
  MENU_PRESETS,
  MENU_PRICE_STYLES,
  MENU_SURFACES,
  MENU_TYPEFACES,
  sanitizeTagline,
} from './menu-design';

// Empty after sanitising (or over 80 characters) → reject; to clear the tagline
// the client sends no `tagline` key.
const tagline = z
  .string()
  .max(400)
  .transform((s) => sanitizeTagline(s))
  .refine((s): s is string => s !== null, 'invalid_tagline');

export const MenuDesignWriteSchema = z.strictObject({
  v: z.literal(1),
  preset: z.enum(MENU_PRESETS),
  surface: z.enum(MENU_SURFACES).optional(),
  typeface: z.enum(MENU_TYPEFACES).optional(),
  items: z.enum(MENU_ITEM_LAYOUTS).optional(),
  header: z.enum(MENU_HEADERS).optional(),
  nav: z.enum(MENU_NAVS).optional(),
  cardStyle: z.enum(MENU_CARD_STYLES).optional(),
  density: z.enum(MENU_DENSITIES).optional(),
  corners: z.enum(MENU_CORNERS).optional(),
  price: z.enum(MENU_PRICE_STYLES).optional(),
  badges: z.enum(MENU_BADGE_STYLES).optional(),
  tagline: tagline.optional(),
});

/** #RGB or #RRGGBB in, uppercase #RRGGBB out (Undo of legacy #RGB rows keeps working). */
export const AccentWrite = z
  .string()
  .transform((s) => normaliseHex(s))
  .refine((s): s is string => s !== null, 'invalid_hex_color');

/** The upload route caps the cover at 380 KB binary ≈ 519k base64 characters. */
export const MENU_COVER_MAX_CHARS = 520_000;
// The whole value is checked, not just the prefix: a cover with an empty or
// non-base64 payload would get a version, switch the header to the cover
// layout and then 404 on the image route (a broken box at the top of the menu).
const RASTER_DATA_URL = /^data:image\/(jpeg|jpg|png|webp|avif);base64,[A-Za-z0-9+/]+={0,2}$/i;

/** Raster data URL only (no http, no SVG, no GIF, base64 payload); '' or null clears it. */
export const CoverWrite = z.union([
  z.null(),
  z.literal('').transform(() => null),
  z.string().max(MENU_COVER_MAX_CHARS).regex(RASTER_DATA_URL, 'IMAGE_FORMAT'),
]);
