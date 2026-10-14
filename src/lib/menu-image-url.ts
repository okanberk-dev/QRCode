/**
 * Public menu images are stored as base64 data URLs in Postgres (CLAUDE.md §3).
 * Inlined into the page they were shipped up to four times per photo (the
 * `<img>`, the RSC payload, the JSON-LD…) — a 3-photo menu weighed 2 MB.
 *
 * Instead the public page points every stored photo at
 * `GET /api/menu/{slug}/img/{itemId|logo}?v={version}`, which streams the
 * decoded image with a year-long immutable cache. The `?v=` part changes
 * whenever the picture changes, so "immutable" never serves a stale photo.
 *
 * SERVER-ONLY (uses node:crypto) — used by `src/app/menu/[slug]/page.tsx` and
 * the image route. Pure otherwise, so it is unit-tested.
 */

import { createHash } from 'node:crypto';

/** Same raster whitelist as `validations.ts` / the theme route. SVG is never served. */
const RASTER_DATA_URL = /^data:image\/(jpeg|jpg|png|webp|gif|avif);base64,/i;

export type RasterMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'image/avif';

export interface ParsedRasterDataUrl {
  mime: RasterMime;
  /** Base64 payload (everything after the comma). */
  base64: string;
}

/** True for an inline raster image we are willing to serve from the image route. */
export function isRasterDataUrl(value: string | null | undefined): boolean {
  return typeof value === 'string' && RASTER_DATA_URL.test(value);
}

/**
 * Split a stored data URL into its MIME type and base64 payload.
 * `image/jpg` is normalised to `image/jpeg` (the former is not a registered
 * type and some clients refuse it). Returns null for anything that is not an
 * allowed raster data URL — including SVG.
 */
export function parseRasterDataUrl(value: string | null | undefined): ParsedRasterDataUrl | null {
  if (typeof value !== 'string') return null;
  const match = RASTER_DATA_URL.exec(value);
  if (!match) return null;
  const subtype = match[1].toLowerCase();
  const mime = (subtype === 'jpg' ? 'image/jpeg' : `image/${subtype}`) as RasterMime;
  const base64 = value.slice(match[0].length);
  if (!base64) return null;
  return { mime, base64 };
}

/** Cache-buster for a menu item: changes whenever the row is updated. */
export function itemImageVersion(updatedAt: Date | string | number | null | undefined): string {
  if (updatedAt === null || updatedAt === undefined) return '0';
  const time = updatedAt instanceof Date ? updatedAt.getTime() : new Date(updatedAt).getTime();
  return Number.isFinite(time) ? Math.max(0, Math.trunc(time)).toString(36) : '0';
}

/**
 * Cache-buster derived from the image itself. Used for the logo, which is
 * written by several routes (menu theme, brand identity, admin) and not all of
 * them touch `menuUpdatedAt` — a timestamp version could leave an old logo
 * pinned in the CDN for a year.
 */
export function contentVersion(value: string): string {
  return createHash('sha1').update(value).digest('base64url').slice(0, 10);
}

/** Relative image route for a stored data URL (item id or the literal `logo`). */
export function menuImagePath(slug: string, itemIdOrLogo: string, version: string): string {
  return `/api/menu/${encodeURIComponent(slug)}/img/${encodeURIComponent(itemIdOrLogo)}?v=${encodeURIComponent(version)}`;
}

/**
 * The `src` the public page should render for a stored image:
 * - raster data URL  → the cached image route (keeps data URLs out of the HTML);
 * - http(s) / other  → unchanged;
 * - empty            → null.
 * Legacy non-raster data URLs (old SVGs) stay inline: they are tiny and render
 * safely inside `<img>`; the image route refuses to serve them.
 */
export function publicImageSrc(args: {
  slug: string;
  itemIdOrLogo: string;
  imageUrl: string | null | undefined;
  version: string;
}): string | null {
  const { slug, itemIdOrLogo, imageUrl, version } = args;
  if (!imageUrl) return null;
  if (isRasterDataUrl(imageUrl)) return menuImagePath(slug, itemIdOrLogo, version);
  return imageUrl;
}

/**
 * Image URL for structured data: absolute, never a data URL. Returns undefined
 * when there is nothing crawlable to point at.
 */
export function jsonLdImageUrl(args: {
  siteUrl: string;
  slug: string;
  itemIdOrLogo: string;
  imageUrl: string | null | undefined;
  version: string;
}): string | undefined {
  const { siteUrl, slug, itemIdOrLogo, imageUrl, version } = args;
  if (!imageUrl) return undefined;
  if (isRasterDataUrl(imageUrl)) {
    return `${siteUrl}${menuImagePath(slug, itemIdOrLogo, version)}`;
  }
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return undefined;
}
