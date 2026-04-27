import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { isValidTableIdentifier, isValidHexColor } from '@/lib/validations';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';
import QRCode from 'qrcode';

const DEFAULT_DARK = '#000000';
const DEFAULT_LIGHT = '#ffffff';
const MIN_WIDTH = 200;
const MAX_WIDTH = 2000;
const DEFAULT_WIDTH = 800;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  maybeSweep();

  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table') || '';
  const format = (searchParams.get('format') || 'svg').toLowerCase();
  const platform = searchParams.get('platform') || '';

  const validPlatforms = ['google', 'yemeksepeti', 'getir', 'trendyol_go'];
  const sanitizedPlatform = platform && validPlatforms.includes(platform) ? platform : '';



  if (format !== 'svg' && format !== 'png') {
    return NextResponse.json({ error: 'Geçersiz format' }, { status: 400 });
  }

  // Validate optional table identifier — prevents arbitrary-length or
  // characters that would break URL parsing / bloat the DB.
  if (!isValidTableIdentifier(table)) {
    return NextResponse.json(
      { error: 'Geçersiz masa numarası (yalnızca harf, rakam, tire ve alt çizgi, maks. 20 karakter)' },
      { status: 400 }
    );
  }

  // Optional visual customisation — gracefully ignored if invalid.
  const darkRaw = searchParams.get('dark');
  const lightRaw = searchParams.get('light');
  const dark = darkRaw && isValidHexColor(darkRaw) ? darkRaw : DEFAULT_DARK;
  const light = lightRaw && isValidHexColor(lightRaw) ? lightRaw : DEFAULT_LIGHT;

  const widthRaw = searchParams.get('width');
  let width = DEFAULT_WIDTH;
  if (widthRaw) {
    const parsed = Number.parseInt(widthRaw, 10);
    if (Number.isFinite(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
      width = parsed;
    }
  }

  // Per-user generation rate limit. Covers both legitimate admins and
  // compromised credentials that would otherwise flood QrGeneration rows.
  const rl = rateLimit(`qr:gen:${actor.id}`, 120, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla QR isteği. Lütfen biraz bekleyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restoran bulunamadı' }, { status: 404 });
    }

    if (!restaurant.isActive) {
      return NextResponse.json(
        { error: 'Bu işletme pasif durumda. QR oluşturmadan önce aktifleştirin.' },
        { status: 409 }
      );
    }

    const hasAccess = await canAccessRestaurant(actor, restaurant.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    const normalizedEnvUrl = envAppUrl?.replace(/\/+$/, '');
    const hasLocalhostEnv = normalizedEnvUrl
      ? /localhost|127\.0\.0\.1/i.test(normalizedEnvUrl)
      : false;
    const appUrl = (!hasLocalhostEnv && normalizedEnvUrl)
      ? normalizedEnvUrl
      : 'https://buaze.com';

    let qrUrl = `${appUrl}/r/${restaurant.slug}?source=qr`;
    if (table) {
      qrUrl += `&table=${encodeURIComponent(table)}`;
    }
    if (sanitizedPlatform) {
      qrUrl += `&platform=${sanitizedPlatform}`;
    }


    // Single-QR concept (2026-04 user request). Each account now has one
    // canonical QR per restaurant, derived from `restaurant.slug` at render
    // time. We no longer write a fresh QrGeneration row on every render —
    // the table is read-only from here on. Existing rows are preserved
    // (intentional "don't break existing QRs"); the history list endpoint
    // (`/api/restaurants/[id]/qr/history`) still returns them, but the
    // owner UI has been simplified to show only the canonical QR.

    const qrOptions = {
      width,
      margin: 2,
      color: { dark, light },
      errorCorrectionLevel: 'H' as const,
    };

    if (format === 'png') {
      const pngBuffer = await QRCode.toBuffer(qrUrl, {
        type: 'png',
        ...qrOptions,
      });

      return new NextResponse(pngBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="qr-${restaurant.slug}${table ? `-masa-${table}` : ''}.png"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // Default: SVG
    const svgString = await QRCode.toString(qrUrl, {
      type: 'svg',
      ...qrOptions,
    });

    return new NextResponse(svgString, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `inline; filename="qr-${restaurant.slug}${table ? `-masa-${table}` : ''}.svg"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json({ error: 'QR kod oluşturulamadı' }, { status: 500 });
  }
}
