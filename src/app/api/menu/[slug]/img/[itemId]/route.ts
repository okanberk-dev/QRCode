import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseRasterDataUrl } from '@/lib/menu-image-url';

/**
 * GET /api/menu/[slug]/img/[itemId] — public photo of a published menu.
 *
 * Product photos (plus the menu logo, `itemId = "logo"`, and the menu cover,
 * `itemId = "cover"`) live as base64 data
 * URLs in Postgres (CLAUDE.md §3). Inlining them into the public page repeated
 * every photo up to four times in the HTML; this route serves each one once,
 * as a real image, with a year-long immutable cache. The page links to it with
 * a `?v=` that changes whenever the picture does, so "immutable" never serves a
 * stale photo.
 *
 * - Read-only and public, but it only ever answers for what the public menu
 *   itself shows: the restaurant must be active, have the menu module on and
 *   the menu published; the item must be live and available and its category
 *   visible. Anything else is a plain 404 (nothing about drafts leaks).
 * - Raster images only (JPEG/PNG/WebP/GIF/AVIF). SVG is never served — opened
 *   directly it could run script on our origin.
 * - A stored http(s) link is not proxied; the caller is sent to it.
 * - 404s are `no-store` so a miss right before publishing is not pinned in the
 *   CDN.
 */

const IMMUTABLE = 'public, max-age=31536000, s-maxage=31536000, immutable';

function notFound() {
  return new NextResponse(null, {
    status: 404,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; itemId: string }> },
) {
  const { slug, itemId } = await params;
  if (!slug || !itemId || slug.length > 120 || itemId.length > 64) return notFound();

  const publishedRestaurant = { slug, isActive: true, menuEnabled: true, menuPublished: true };

  let stored: string | null | undefined;
  try {
    if (itemId === 'logo') {
      const restaurant = await prisma.restaurant.findFirst({
        where: publishedRestaurant,
        select: { menuLogoUrl: true },
      });
      stored = restaurant?.menuLogoUrl;
    } else if (itemId === 'cover') {
      // Item ids are cuids, so the literal `cover` cannot collide.
      const restaurant = await prisma.restaurant.findFirst({
        where: publishedRestaurant,
        select: { menuCoverUrl: true },
      });
      stored = restaurant?.menuCoverUrl;
    } else {
      const item = await prisma.menuItem.findFirst({
        where: {
          id: itemId,
          deletedAt: null,
          isAvailable: true,
          category: { isVisible: true, deletedAt: null },
          restaurant: publishedRestaurant,
        },
        select: { imageUrl: true },
      });
      stored = item?.imageUrl;
    }
  } catch (error) {
    console.error('[menu img] lookup failed', error instanceof Error ? error.name : 'unknown');
    return new NextResponse(null, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }

  if (!stored) return notFound();

  // A link the owner pasted instead of uploading: send the visitor there.
  if (/^https?:\/\//i.test(stored)) {
    return NextResponse.redirect(stored, { status: 302, headers: { 'Cache-Control': 'no-store' } });
  }

  const parsed = parseRasterDataUrl(stored);
  if (!parsed) return notFound();

  const bytes = Buffer.from(parsed.base64, 'base64');
  if (bytes.byteLength === 0) return notFound();

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': parsed.mime,
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': IMMUTABLE,
      // Only whitelisted raster MIME types are ever sent; nosniff stops a
      // browser from second-guessing the type.
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
