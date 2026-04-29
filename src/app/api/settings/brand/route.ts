import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { isValidHexColor } from '@/lib/validations';

export const dynamic = 'force-dynamic';

const VALID_FONTS = new Set(['Space Grotesk', 'Inter', 'Manrope', 'system']);
const SLOGAN_MAX = 140;

function normalizeImageUrl(value: unknown, maxDataUrlBytes = 300_000) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  const raw = value.trim();
  if (!raw) return null;
  const isDataUrl = raw.startsWith('data:image/');
  if (isDataUrl && raw.length <= maxDataUrlBytes) return raw;
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

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get('restaurantId');
  if (!restaurantId) return NextResponse.json({ error: 'missing_restaurant_id' }, { status: 400 });

  const access = await requireAccess(req, restaurantId);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const [settings, restaurant] = await Promise.all([
    prisma.brandSettings.findUnique({ where: { restaurantId } }),
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true, menuLogoUrl: true, menuAccentColor: true, primaryColor: true },
    }),
  ]);

  if (!restaurant) return NextResponse.json({ error: 'restaurant_not_found' }, { status: 404 });

  return NextResponse.json({
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
  });
}

export async function PUT(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const restaurantId = typeof body.restaurantId === 'string' ? body.restaurantId.trim() : '';
  if (!restaurantId) return NextResponse.json({ error: 'missing_restaurant_id' }, { status: 400 });

  const access = await requireAccess(req, restaurantId);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true },
  });
  if (!restaurant) return NextResponse.json({ error: 'restaurant_not_found' }, { status: 404 });

  const logoUrl = normalizeImageUrl(body.logoUrl);
  if (logoUrl === 'invalid') return NextResponse.json({ error: 'invalid_logo_url' }, { status: 400 });

  const faviconUrl = normalizeImageUrl(body.faviconUrl);
  if (faviconUrl === 'invalid') return NextResponse.json({ error: 'invalid_favicon_url' }, { status: 400 });

  // Section 2 — Kapak görseli (Faz 1 MVP). 16:9 görsel; base64 data URL daha
  // geniş olabilir (yaklaşık 500KB). Boş string clear, undefined dokunma.
  const coverImageUrl =
    body.coverImageUrl === undefined ? undefined : normalizeImageUrl(body.coverImageUrl, 500_000);
  if (coverImageUrl === 'invalid') {
    return NextResponse.json({ error: 'invalid_cover_image_url' }, { status: 400 });
  }

  const primaryColor = normalizeColor(body.primaryColor);
  if (primaryColor === 'invalid') return NextResponse.json({ error: 'invalid_primary_color' }, { status: 400 });

  const secondaryColor = normalizeColor(body.secondaryColor);
  if (secondaryColor === 'invalid') return NextResponse.json({ error: 'invalid_secondary_color' }, { status: 400 });

  const accentColor = normalizeColor(body.accentColor);
  if (accentColor === 'invalid') return NextResponse.json({ error: 'invalid_accent_color' }, { status: 400 });

  const accentFont = body.accentFont === null || body.accentFont === ''
    ? null
    : typeof body.accentFont === 'string' && VALID_FONTS.has(body.accentFont)
      ? body.accentFont
      : undefined;
  if (accentFont === undefined) return NextResponse.json({ error: 'invalid_accent_font' }, { status: 400 });

  const slogan = normalizeSlogan(body.slogan);
  if (slogan === 'invalid') return NextResponse.json({ error: 'invalid_slogan' }, { status: 400 });

  const settings = await prisma.brandSettings.upsert({
    where: { restaurantId },
    create: {
      restaurantId,
      logoUrl,
      faviconUrl,
      // coverImageUrl undefined → omit on create (Prisma default null).
      ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
      primaryColor,
      secondaryColor,
      accentColor,
      accentFont,
      slogan,
    },
    update: {
      logoUrl,
      faviconUrl,
      ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
      primaryColor,
      secondaryColor,
      accentColor,
      accentFont,
      slogan,
    },
  });

  // Mirror logo + accent + primary onto Restaurant for public-surface read perf
  // (CLAUDE.md §19.3 edge cache; menu/PublicMenuView/QR landing reuse).
  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      menuLogoUrl: logoUrl,
      menuAccentColor: accentColor,
      ...(primaryColor ? { primaryColor } : {}),
    },
  });

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
