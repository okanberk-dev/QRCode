import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { isValidHexColor } from '@/lib/validations';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';
import QRCode from 'qrcode';

const MAX_BATCH = 50;
const MIN_BATCH_WIDTH = 200;
const MAX_BATCH_WIDTH = 1200;
const DEFAULT_BATCH_WIDTH = 512;

/**
 * Batch-generate QR codes for a contiguous table range.
 * Body: { from: number, to: number, dark?, light?, width? }
 * Response: { items: [{ table, qrUrl, svg }] }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  maybeSweep();

  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  // Tight rate limit: batch operations are the main abuse surface.
  const rl = await rateLimit(`qr:batch:${actor.id}`, 5, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla toplu istek. Lütfen biraz bekleyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  const { id } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
  }

  const from = Number.parseInt(body?.from, 10);
  const to = Number.parseInt(body?.to, 10);

  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) {
    return NextResponse.json({ error: 'Geçerli bir masa aralığı girin (from <= to, >=1)' }, { status: 400 });
  }

  const count = to - from + 1;
  if (count > MAX_BATCH) {
    return NextResponse.json(
      { error: `Tek seferde en fazla ${MAX_BATCH} masa için QR oluşturulabilir.` },
      { status: 400 }
    );
  }

  const dark = isValidHexColor(body?.dark) ? body.dark : '#000000';
  const light = isValidHexColor(body?.light) ? body.light : '#ffffff';
  let width = DEFAULT_BATCH_WIDTH;
  const parsedWidth = Number.parseInt(body?.width, 10);
  if (Number.isFinite(parsedWidth) && parsedWidth >= MIN_BATCH_WIDTH && parsedWidth <= MAX_BATCH_WIDTH) {
    width = parsedWidth;
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
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

    const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/+$/, '');
    const hasLocalhost = envAppUrl ? /localhost|127\.0\.0\.1/i.test(envAppUrl) : false;
    const appUrl = (!hasLocalhost && envAppUrl) ? envAppUrl : 'https://buaze.com';

    const items: { table: string; qrUrl: string; svg: string }[] = [];
    for (let t = from; t <= to; t += 1) {
      const table = String(t);
      const qrUrl = `${appUrl}/r/${restaurant.slug}?source=qr&table=${encodeURIComponent(table)}`;
      // eslint-disable-next-line no-await-in-loop
      const svg = await QRCode.toString(qrUrl, {
        type: 'svg',
        width,
        margin: 2,
        color: { dark, light },
        errorCorrectionLevel: 'H',
      });
      items.push({ table, qrUrl, svg });
    }

    // Record a single batch entry — non-fatal if table doesn't exist yet.
    try {
      await prisma.$transaction(async (tx) => {
        await tx.qrGeneration.create({
          data: {
            restaurantId: restaurant.id,
            qrUrl: `${appUrl}/r/${restaurant.slug}?source=qr&batch=${from}-${to}`,
            tableNumber: `${from}-${to}`,
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
            where: { id: { in: overflow.map((i) => i.id) } },
          });
        }
      });
    } catch (trackErr) {
      console.warn('[QR] Batch tracking skipped:', (trackErr as Error).message);
    }

    return NextResponse.json(
      { items, count: items.length, restaurantName: restaurant.name, slug: restaurant.slug },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('QR batch error:', err);
    return NextResponse.json({ error: 'Toplu QR oluşturulamadı' }, { status: 500 });
  }
}
