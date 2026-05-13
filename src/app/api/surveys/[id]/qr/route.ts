// Stage 98 — Survey QR code generator. PNG / SVG download. Reuses the
// existing aesthetic QR pattern from /api/restaurants/[id]/qr/route.ts
// (premium PNG composite with restaurant name footer, plain SVG).

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';
import { isValidHexColor } from '@/lib/validations';
import { renderAestheticQrSvg } from '@/lib/qr-aesthetic';
import { composePremiumQrPng } from '@/lib/qr-premium-png';

const DEFAULT_DARK = '#000000';
const DEFAULT_LIGHT = '#ffffff';
const MIN_WIDTH = 200;
const MAX_WIDTH = 2000;
const DEFAULT_WIDTH = 800;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  maybeSweep();

  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const format = (searchParams.get('format') || 'svg').toLowerCase();
  if (format !== 'svg' && format !== 'png') {
    return NextResponse.json({ error: 'Geçersiz format' }, { status: 400 });
  }

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

  const rl = await rateLimit(`survey-qr:${actor.id}`, 120, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla QR isteği. Lütfen biraz bekleyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  const survey = await prisma.survey.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      restaurantId: true,
      restaurant: { select: { name: true } },
    },
  });
  if (!survey) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

  const hasAccess = await canAccessRestaurant(actor, survey.restaurantId);
  if (!hasAccess) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const normalizedEnvUrl = envAppUrl?.replace(/\/+$/, '');
  const hasLocalhostEnv = normalizedEnvUrl
    ? /localhost|127\.0\.0\.1/i.test(normalizedEnvUrl)
    : false;
  const appUrl =
    !hasLocalhostEnv && normalizedEnvUrl ? normalizedEnvUrl : 'https://buaze.com';
  const qrUrl = `${appUrl}/s/${survey.slug}?source=qr`;

  const style = (searchParams.get('style') || 'aesthetic').toLowerCase();
  const usePlain = style === 'plain';

  if (format === 'png') {
    try {
      const hostForFooter = (() => {
        try {
          const u = new URL(qrUrl);
          const path = u.pathname.replace(/^\/+|\/+$/g, '');
          const host = u.hostname.replace(/^www\./, '');
          return path ? `${host}/${path.split('?')[0]}` : host;
        } catch {
          return 'buaze.com';
        }
      })();
      const pngBuffer = usePlain
        ? await QRCode.toBuffer(qrUrl, {
            type: 'png',
            width,
            margin: 2,
            color: { dark, light },
            errorCorrectionLevel: 'H' as const,
          })
        : await composePremiumQrPng({
            data: qrUrl,
            size: width,
            dark,
            light,
            restaurantName: `${survey.restaurant.name} · ${survey.title}`.slice(0, 80),
            qrHost: hostForFooter,
            locale: 'tr',
          });
      return new NextResponse(new Uint8Array(pngBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="anket-${survey.slug}.png"`,
          'Cache-Control': 'no-store',
        },
      });
    } catch (err) {
      console.error('[Survey QR] premium composite failed, falling back:', err);
      const fallback = await QRCode.toBuffer(qrUrl, {
        type: 'png',
        width,
        margin: 2,
        color: { dark, light },
        errorCorrectionLevel: 'H' as const,
      });
      return new NextResponse(new Uint8Array(fallback), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="anket-${survey.slug}.png"`,
          'Cache-Control': 'no-store',
        },
      });
    }
  }

  // SVG branch
  const svg = usePlain
    ? await QRCode.toString(qrUrl, {
        type: 'svg',
        width,
        margin: 2,
        color: { dark, light },
        errorCorrectionLevel: 'H' as const,
      })
    : renderAestheticQrSvg({ data: qrUrl, size: width, dark, light }).svg;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': `attachment; filename="anket-${survey.slug}.svg"`,
      'Cache-Control': 'no-store',
    },
  });
}
