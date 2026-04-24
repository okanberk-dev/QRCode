import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { isValidHexColor } from '@/lib/validations';

export const dynamic = 'force-dynamic';

const VALID_FONTS = new Set(['Space Grotesk', 'Inter', 'Manrope', 'system']);

function normalizeLogoUrl(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  const raw = value.trim();
  if (!raw) return null;
  const isDataUrl = raw.startsWith('data:image/');
  if (isDataUrl && raw.length <= 300_000) return raw;
  try {
    const url = new URL(raw);
    if ((url.protocol === 'http:' || url.protocol === 'https:') && raw.length <= 1000) return raw;
  } catch {
    // handled below
  }
  return 'invalid';
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
      select: { id: true, menuLogoUrl: true, menuAccentColor: true, primaryColor: true },
    }),
  ]);

  if (!restaurant) return NextResponse.json({ error: 'restaurant_not_found' }, { status: 404 });

  return NextResponse.json({
    restaurantId,
    logoUrl: settings?.logoUrl ?? restaurant.menuLogoUrl ?? null,
    accentColor: settings?.accentColor ?? restaurant.menuAccentColor ?? restaurant.primaryColor,
    accentFont: settings?.accentFont ?? 'Space Grotesk',
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

  const logoUrl = normalizeLogoUrl(body.logoUrl);
  if (logoUrl === 'invalid') return NextResponse.json({ error: 'invalid_logo_url' }, { status: 400 });

  const accentColor = body.accentColor === null || body.accentColor === ''
    ? null
    : typeof body.accentColor === 'string' && isValidHexColor(body.accentColor)
      ? body.accentColor
      : undefined;
  if (accentColor === undefined) return NextResponse.json({ error: 'invalid_accent_color' }, { status: 400 });

  const accentFont = body.accentFont === null || body.accentFont === ''
    ? null
    : typeof body.accentFont === 'string' && VALID_FONTS.has(body.accentFont)
      ? body.accentFont
      : undefined;
  if (accentFont === undefined) return NextResponse.json({ error: 'invalid_accent_font' }, { status: 400 });

  const settings = await prisma.brandSettings.upsert({
    where: { restaurantId },
    create: { restaurantId, logoUrl, accentColor, accentFont },
    update: { logoUrl, accentColor, accentFont },
  });

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      menuLogoUrl: logoUrl,
      menuAccentColor: accentColor,
    },
  });

  return NextResponse.json({
    ok: true,
    restaurantId: settings.restaurantId,
    logoUrl: settings.logoUrl,
    accentColor: settings.accentColor,
    accentFont: settings.accentFont,
    updatedAt: settings.updatedAt.toISOString(),
  });
}
