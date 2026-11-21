import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, canWriteRestaurant } from '@/lib/panel-access';
import { isValidHexColor } from '@/lib/validations';
import { normaliseHex } from '@/lib/qr-colors';
import { revalidatePublicMenu } from '@/lib/restaurant-revalidate';

export const dynamic = 'force-dynamic';

const VALID_FONTS = new Set(['Space Grotesk', 'Inter', 'Manrope', 'system']);
const SLOGAN_MAX = 140;

// Raster formats only. `data:image/svg+xml` can carry <script> and is
// mirrored into Restaurant.menuLogoUrl, which the public menu renders —
// same allow-list as the restaurant PUT (A3 audit fix).
const DATA_URL_RASTER_RE = /^data:image\/(jpeg|jpg|png|webp|gif|avif);base64,/i;

function normalizeImageUrl(value: unknown, maxDataUrlBytes = 300_000) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  const raw = value.trim();
  if (!raw) return null;
  if (raw.startsWith('data:')) {
    return DATA_URL_RASTER_RE.test(raw) && raw.length <= maxDataUrlBytes ? raw : 'invalid';
  }
  try {
    const url = new URL(raw);
    if ((url.protocol === 'http:' || url.protocol === 'https:') && raw.length <= 1000) return raw;
  } catch {
    // handled below
  }
  return 'invalid';
}

function normalizeColor(value: unknown): string | null | 'invalid' {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isValidHexColor(trimmed) ? trimmed.toUpperCase() : 'invalid';
}

function normalizeSlogan(value: unknown): string | null | 'invalid' {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > SLOGAN_MAX) return 'invalid';
  return trimmed;
}

async function requireAccess(req: NextRequest, restaurantId: string) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return { error: 'unauthorized' as const, status: 401 };
  if (!(await canAccessRestaurant(actor, restaurantId))) {
    return { error: 'forbidden_restaurant' as const, status: 403 };
  }
  return { actor };
}

/**
 * §38.238 — write gate for the PUT path.
 *
 * `canAccessRestaurant` is a READ scope check: it passes every team member,
 * `viewer` included. Brand settings drive the logo and colours shown on the
 * public review page, so gating the write on the read check let a read-only
 * teammate repaint the business's customer-facing surface.
 */
async function requireWriteAccess(req: NextRequest, restaurantId: string) {
  const access = await requireAccess(req, restaurantId);
  if ('error' in access) return access;
  if (!(await canWriteRestaurant(access.actor, restaurantId))) {
    return { error: 'forbidden_readonly' as const, status: 403 };
  }
  return access;
}

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get('restaurantId');
  if (!restaurantId) return NextResponse.json({ error: 'missing_restaurant_id' }, { status: 400 });

  const access = await requireAccess(req, restaurantId);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  // Two independent reads, run at once (was an array $transaction).
  const [settings, restaurant] = await Promise.all([
    prisma.brandSettings.findUnique({ where: { restaurantId } }),
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true, menuLogoUrl: true, menuAccentColor: true, primaryColor: true },
    }),
  ]);

  if (!restaurant) return NextResponse.json({ error: 'restaurant_not_found' }, { status: 404 });

  // Stage 87 §38.167 — Settings → Brand identity (logo + color +
  // slogan + font); cache header private 60s/300sw (mutation rare —
  // owner günde 1-2 brand edit). §38.100 paterni reuse.
  return NextResponse.json(
    {
      restaurantId,
      name: restaurant.name,
      logoUrl: settings?.logoUrl ?? restaurant.menuLogoUrl ?? null,
      faviconUrl: settings?.faviconUrl ?? null,
      coverImageUrl: settings?.coverImageUrl ?? null,
      primaryColor: settings?.primaryColor ?? restaurant.primaryColor,
      secondaryColor: settings?.secondaryColor ?? null,
      accentColor: settings?.accentColor ?? restaurant.menuAccentColor ?? restaurant.primaryColor,
      accentFont: settings?.accentFont ?? 'Space Grotesk',
      slogan: settings?.slogan ?? null,
      updatedAt: settings?.updatedAt?.toISOString() ?? null,
    },
    {
      headers: {
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}

export async function PUT(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const restaurantId = typeof body.restaurantId === 'string' ? body.restaurantId.trim() : '';
  if (!restaurantId) return NextResponse.json({ error: 'missing_restaurant_id' }, { status: 400 });

  const access = await requireWriteAccess(req, restaurantId);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, slug: true },
  });
  if (!restaurant) return NextResponse.json({ error: 'restaurant_not_found' }, { status: 404 });

  // Partial update: a field that is ABSENT from the body is left as is;
  // `null` / '' clears it. The PUT used to treat every field as required —
  // the cover upload/remove calls (which send only `coverImageUrl`) always
  // failed with `invalid_accent_font`, and any caller that did include
  // accentFont silently wiped the logo, favicon, colours and slogan and
  // nulled Restaurant.menuLogoUrl / menuAccentColor.
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

  const logoUrl = has('logoUrl') ? normalizeImageUrl(body.logoUrl) : undefined;
  if (logoUrl === 'invalid') return NextResponse.json({ error: 'invalid_logo_url' }, { status: 400 });

  const faviconUrl = has('faviconUrl') ? normalizeImageUrl(body.faviconUrl) : undefined;
  if (faviconUrl === 'invalid') return NextResponse.json({ error: 'invalid_favicon_url' }, { status: 400 });

  // Section 2 — Kapak görseli (Faz 1 MVP). 16:9 görsel; base64 data URL daha
  // geniş olabilir (yaklaşık 500KB).
  const coverImageUrl = has('coverImageUrl') ? normalizeImageUrl(body.coverImageUrl, 500_000) : undefined;
  if (coverImageUrl === 'invalid') {
    return NextResponse.json({ error: 'invalid_cover_image_url' }, { status: 400 });
  }

  const primaryColor = has('primaryColor') ? normalizeColor(body.primaryColor) : undefined;
  if (primaryColor === 'invalid') return NextResponse.json({ error: 'invalid_primary_color' }, { status: 400 });

  const secondaryColor = has('secondaryColor') ? normalizeColor(body.secondaryColor) : undefined;
  if (secondaryColor === 'invalid') return NextResponse.json({ error: 'invalid_secondary_color' }, { status: 400 });

  const accentColor = has('accentColor') ? normalizeColor(body.accentColor) : undefined;
  if (accentColor === 'invalid') return NextResponse.json({ error: 'invalid_accent_color' }, { status: 400 });

  let accentFont: string | null | undefined;
  if (has('accentFont')) {
    if (body.accentFont === null || body.accentFont === '') accentFont = null;
    else if (typeof body.accentFont === 'string' && VALID_FONTS.has(body.accentFont)) accentFont = body.accentFont;
    else return NextResponse.json({ error: 'invalid_accent_font' }, { status: 400 });
  }

  const slogan = has('slogan') ? normalizeSlogan(body.slogan) : undefined;
  if (slogan === 'invalid') return NextResponse.json({ error: 'invalid_slogan' }, { status: 400 });

  const fields = {
    ...(logoUrl !== undefined ? { logoUrl } : {}),
    ...(faviconUrl !== undefined ? { faviconUrl } : {}),
    ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
    ...(primaryColor !== undefined ? { primaryColor } : {}),
    ...(secondaryColor !== undefined ? { secondaryColor } : {}),
    ...(accentColor !== undefined ? { accentColor } : {}),
    ...(accentFont !== undefined ? { accentFont } : {}),
    ...(slogan !== undefined ? { slogan } : {}),
  };
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 });
  }

  const settings = await prisma.brandSettings.upsert({
    where: { restaurantId },
    create: { restaurantId, ...fields },
    update: fields,
  });

  // Mirror logo + accent + primary onto Restaurant for public-surface read perf
  // (CLAUDE.md §19.3 edge cache; menu/PublicMenuView/QR landing reuse) —
  // only the fields this request actually changed.
  const mirror = {
    ...(logoUrl !== undefined ? { menuLogoUrl: logoUrl } : {}),
    // The public menu reads uppercase #RRGGBB (#RGB is expanded).
    ...(accentColor !== undefined ? { menuAccentColor: accentColor ? normaliseHex(accentColor) : null } : {}),
    ...(primaryColor ? { primaryColor } : {}),
  };
  if (Object.keys(mirror).length > 0) {
    await prisma.restaurant.update({ where: { id: restaurantId }, data: mirror });
    // The public menu is ISR-cached; show the new logo / colours now.
    revalidatePublicMenu(restaurant.slug);
  }

  return NextResponse.json({
    ok: true,
    restaurantId: settings.restaurantId,
    logoUrl: settings.logoUrl,
    faviconUrl: settings.faviconUrl,
    coverImageUrl: settings.coverImageUrl,
    primaryColor: settings.primaryColor,
    secondaryColor: settings.secondaryColor,
    accentColor: settings.accentColor,
    accentFont: settings.accentFont,
    slogan: settings.slogan,
    updatedAt: settings.updatedAt.toISOString(),
  });
}
