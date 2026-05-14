import { NextRequest, NextResponse } from 'next/server';
import { recordPlatformRedirect } from '@/lib/platform-redirect';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Public platform-redirect tracker. Body: { slug, provider, source? }.
 * Müşteri /r/[slug]'da yıldız verip dış platforma yönlendirildiğinde
 * fire-and-forget POST. Mevcut client-side `window.location.href` redirect
 * akışı korunur — bu endpoint sadece event log, **redirect yapmaz**
 * (open-redirect imkansız).
 *
 * Rate limit: 60/dk/IP — refresh + form spam abuse'una karşı, qr-scan
 * (30/dk) ile uyumlu (redirect typically scan'den 1-2 saniye sonra,
 * aynı session'da). Inactive/missing slug → silent 200. Auth/IDOR yok —
 * public surface (CLAUDE.md §14.2 pattern).
 */
export async function POST(req: NextRequest) {
  // CLAUDE.md §37.2.D + §40.4.D — `getClientIp()` ham `x-forwarded-for`'u
  // tek noktadan parse eder; saldırgan `XFF: a, b, c` ile rate-limit key
  // pivot edemez (mevcut split(',')[0] paterni Stage 105 audit'inde tüm
  // public POST'larda normalize edildi).
  const ip = getClientIp(req.headers);

  const limit = await rateLimit(`platform-redirect:ip:${ip}`, 60, 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate_limit' }, { status: 429 });
  }

  let body: {
    slug?: unknown;
    provider?: unknown;
    source?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (typeof body.slug !== 'string' || !body.slug.trim()) {
    return NextResponse.json({ error: 'slug_required' }, { status: 400 });
  }
  if (typeof body.provider !== 'string' || !body.provider.trim()) {
    return NextResponse.json({ error: 'provider_required' }, { status: 400 });
  }

  const ua = req.headers.get('user-agent') || null;
  await recordPlatformRedirect({
    slug: body.slug,
    provider: body.provider,
    source: typeof body.source === 'string' ? body.source : null,
    ua,
  });

  return NextResponse.json({ ok: true });
}
