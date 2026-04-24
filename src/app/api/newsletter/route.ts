import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { email?: string; locale?: string; source?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@') || email.length > 200) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  const ip = getClientIp(req.headers);
  const limit = rateLimit(`newsletter:${ip}`, 10, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  const locale = body.locale === 'en' ? 'en' : 'tr';
  const source = typeof body.source === 'string' ? body.source.slice(0, 64) : null;

  await prisma.newsletterSubscriber.upsert({
    where: { email },
    create: { email, locale, source, ip },
    update: {
      locale,
      ...(source ? { source } : {}),
      unsubscribedAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
