import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, canWriteRestaurant } from '@/lib/panel-access';
import { isValidHexColor } from '@/lib/validations';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';
import QRCode from 'qrcode';

const MAX_BATCH = 50;
const MIN_BATCH_WIDTH = 200;
const MAX_BATCH_WIDTH = 1200;
const DEFAULT_BATCH_WIDTH = 512;

async function rememberBatchQr(params: {
  restaurantId: string;
  qrUrl: string;
  tableNumber: string;
}) {
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.qrGeneration.findFirst({
        where: {
          restaurantId: params.restaurantId,
          type: 'feedback',
          tableNumber: params.tableNumber,
          platform: null,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      if (existing) {
        await tx.qrGeneration.update({
          where: { id: existing.id },
          data: { qrUrl: params.qrUrl },
        });
        return;
      }

      await tx.qrGeneration.create({
        data: {
          restaurantId: params.restaurantId,
          qrUrl: params.qrUrl,
          tableNumber: params.tableNumber,
          type: 'feedback',
        },
      });
    });
  } catch (trackErr) {
    const code = (trackErr as { code?: string })?.code;
    if (code !== 'P2021' && code !== 'P2022') {
      console.warn('[QR] Batch tracking skipped:', (trackErr as Error).message);
    }
  }
}

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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
  }

  const from = Number.parseInt(String(body?.from ?? ''), 10);
  const to = Number.parseInt(String(body?.to ?? ''), 10);

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
  const parsedWidth = Number.parseInt(String(body?.width ?? ''), 10);
  if (Number.isFinite(parsedWidth) && parsedWidth >= MIN_BATCH_WIDTH && parsedWidth <= MAX_BATCH_WIDTH) {
    width = parsedWidth;
  }

  try {
    // Access check BEFORE loading the row (no existence / isActive oracle
    // for restaurants the actor can't see).
    const hasAccess = await canAccessRestaurant(actor, id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: { id: true, slug: true, name: true, isActive: true },
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

    const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/+$/, '');
    const hasLocalhost = envAppUrl ? /localhost|127\.0\.0\.1/i.test(envAppUrl) : false;
    const appUrl = (!hasLocalhost && envAppUrl) ? envAppUrl : 'https://www.buaze.com';

    const items: { table: string; qrUrl: string; svg: string }[] = [];
    for (let t = from; t <= to; t += 1) {
      const table = String(t);
      const qrUrl = `${appUrl}/r/${restaurant.slug}?source=qr&table=${encodeURIComponent(table)}`;
       
      const svg = await QRCode.toString(qrUrl, {
        type: 'svg',
        width,
        margin: 2,
        color: { dark, light },
        errorCorrectionLevel: 'H',
      });
      items.push({ table, qrUrl, svg });
    }

    // Record one canonical batch entry for this exact range — a write, so
    // only for writers (viewers still receive the generated SVGs).
    if (await canWriteRestaurant(actor, restaurant.id)) await rememberBatchQr({
      restaurantId: restaurant.id,
      qrUrl: `${appUrl}/r/${restaurant.slug}?source=qr&batch=${from}-${to}`,
      tableNumber: `${from}-${to}`,
    });

    return NextResponse.json(
      { items, count: items.length, restaurantName: restaurant.name, slug: restaurant.slug },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('QR batch error:', err);
    return NextResponse.json({ error: 'Toplu QR oluşturulamadı' }, { status: 500 });
  }
}
