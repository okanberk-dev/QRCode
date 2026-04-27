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
  const rl = await rateLimit(`qr:gen:${actor.id}`, 120, 60 * 1000);
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


    // Track generation — non-fatal if the qr_generations table hasn't been
    // provisioned yet (e.g. first deploy before `prisma db push`).
    try {
      await prisma.$transaction(async (tx) => {
        await tx.qrGeneration.create({
          data: {
            restaurantId: restaurant.id,
            qrUrl,
            tableNumber: table || null,
            platform: sanitizedPlatform || null,
          },
        });

        const overflow = await tx.qrGeneration.findMany({
          where: { restaurantId: restaurant.id },
          orderBy: { createdAt: 'desc' },
          skip: 50,
          select: { id: true },
        });

        if (overflow.length > 0) {
          await tx.qrGeneration.deleteMany({
            where: { id: { in: overflow.map((item) => item.id) } },
          });
        }
      });
    } catch (trackErr) {
      console.warn('[QR] Generation tracking skipped (table may not exist):', (trackErr as Error).message);
    }

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

      return new NextResponse(new Uint8Array(pngBuffer), {
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
