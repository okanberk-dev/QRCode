import { NextRequest, NextResponse } from 'next/server';
import { recordQrScan } from '@/lib/qr-scan';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Public QR scan tracker. Body: { slug, tableNumber?, platform?, source?, sessionId? }.
 * Rate limit 30/dk/IP — re-scan abuse + DDoS koruması. Inactive/missing
 * restaurant → silent 200 (fingerprinting önleme). Auth/IDOR yok — public
 * surface; CLAUDE.md §14.2 pattern.
 */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    (req as unknown as { ip?: string }).ip ||
    'unknown';

  const limit = await rateLimit(`qr-scan:ip:${ip}`, 30, 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate_limit' }, { status: 429 });
  }

  let body: {
    slug?: unknown;
    tableNumber?: unknown;
    platform?: unknown;
    source?: unknown;
    sessionId?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (typeof body.slug !== 'string' || !body.slug.trim()) {
    return NextResponse.json({ error: 'slug_required' }, { status: 400 });
  }

  const ua = req.headers.get('user-agent') || null;
  await recordQrScan({
    slug: body.slug,
    tableNumber: typeof body.tableNumber === 'string' ? body.tableNumber : null,
    platform: typeof body.platform === 'string' ? body.platform : null,
    source: typeof body.source === 'string' ? body.source : null,
    sessionId: typeof body.sessionId === 'string' ? body.sessionId : null,
    ip,
    ua,
  });

  return NextResponse.json({ ok: true });
}
