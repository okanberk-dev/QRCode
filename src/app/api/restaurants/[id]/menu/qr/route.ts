import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess } from '@/lib/menu-access';
import { isValidHexColor } from '@/lib/validations';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';
import QRCode from 'qrcode';

const DEFAULT_LIGHT = '#ffffff';
const MIN_WIDTH = 200;
const MAX_WIDTH = 2000;
const DEFAULT_WIDTH = 800;

async function rememberMenuQr(restaurantId: string, qrUrl: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.qrGeneration.findFirst({
        where: {
          restaurantId,
          type: 'menu',
          tableNumber: null,
          platform: null,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      if (existing) {
        await tx.qrGeneration.update({
          where: { id: existing.id },
          data: { qrUrl },
        });
        return;
      }

      await tx.qrGeneration.create({
        data: {
          restaurantId,
          qrUrl,
          type: 'menu',
        },
      });
    });
  } catch (trackErr) {
    const code = (trackErr as { code?: string })?.code;
    if (code !== 'P2021' && code !== 'P2022') {
      console.warn('[MenuQR] Generation tracking skipped:', (trackErr as Error).message);
    }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  maybeSweep();
  const { id } = await params;

  const access = await requireRestaurantAccess(req, id);
  if (!access.ok) return access.res;

  const { searchParams } = new URL(req.url);
  const format = (searchParams.get('format') || 'png').toLowerCase();

  if (format !== 'svg' && format !== 'png') {
    return NextResponse.json({ error: 'Geçersiz format. png veya svg olmalı.' }, { status: 400 });
  }

  const lightRaw = searchParams.get('light');
  const light = lightRaw && isValidHexColor(lightRaw) ? lightRaw : DEFAULT_LIGHT;

  const widthRaw = searchParams.get('width');
  let width = DEFAULT_WIDTH;
  if (widthRaw) {
    const parsed = Number.parseInt(widthRaw, 10);
    if (Number.isFinite(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
      width = parsed;
    }
  }

  const rl = await rateLimit(`qr:menu:${access.actor!.id}`, 120, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla QR isteği. Lütfen biraz bekleyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: { id: true, slug: true, isActive: true, menuAccentColor: true, primaryColor: true },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restoran bulunamadı' }, { status: 404 });
    }

    if (!restaurant.isActive) {
      return NextResponse.json(
        { error: 'Bu işletme pasif durumda.' },
        { status: 409 }
      );
    }

    const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    const normalizedEnvUrl = envAppUrl?.replace(/\/+$/, '');
    const hasLocalhostEnv = normalizedEnvUrl
      ? /localhost|127\.0\.0\.1/i.test(normalizedEnvUrl)
      : false;
    const appUrl = (!hasLocalhostEnv && normalizedEnvUrl)
      ? normalizedEnvUrl
      : 'https://buaze.com';

    // Attribution: analytics pipeline reads `source=qr` from the landing URL.
    const qrUrl = `${appUrl}/menu/${restaurant.slug}?source=qr`;

    const darkRaw = searchParams.get('dark');
    const defaultDark = restaurant.menuAccentColor ?? restaurant.primaryColor ?? '#000000';
    const dark = darkRaw && isValidHexColor(darkRaw) ? darkRaw : defaultDark;

    await rememberMenuQr(restaurant.id, qrUrl);

    const qrOptions = {
      width,
      margin: 2,
      color: { dark, light },
      errorCorrectionLevel: 'H' as const,
    };

    if (format === 'png') {
      const pngBuffer = await QRCode.toBuffer(qrUrl, { type: 'png', ...qrOptions });
      return new NextResponse(pngBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="menu-qr-${restaurant.slug}.png"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const svgString = await QRCode.toString(qrUrl, { type: 'svg', ...qrOptions });
    return new NextResponse(svgString, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="menu-qr-${restaurant.slug}.svg"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[MenuQR] Error:', error);
    return NextResponse.json({ error: 'QR kod oluşturulamadı' }, { status: 500 });
  }
}
