import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { verifyRecaptchaToken } from '@/lib/recaptcha';
import { sendFormConfirmationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { email?: string; locale?: string; source?: string; recaptchaToken?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@') || email.length > 200) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  const captcha = await verifyRecaptchaToken(req, body.recaptchaToken, 'newsletter_signup');
  if (!captcha.ok) {
    return NextResponse.json({ error: 'recaptcha_failed' }, { status: captcha.status });
  }

  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`newsletter:${ip}`, 10, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  const locale = body.locale === 'en' ? 'en' : 'tr';
  const source = typeof body.source === 'string' ? body.source.slice(0, 64) : null;

  // Token is required for the unsubscribe link in marketing emails. Generated
  // on create and reused on resubscribe so the same person can\'t accumulate
  // tokens by signing up twice.
  const newToken = crypto.randomBytes(24).toString('hex');
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email },
    select: { id: true, unsubscribedAt: true },
  });

  await prisma.newsletterSubscriber.upsert({
    where: { email },
    create: { email, locale, source, ip, unsubscribeToken: newToken },
    update: {
      locale,
      ...(source ? { source } : {}),
      unsubscribedAt: null,
    },
  });

  // Instant welcome mail. Fire-and-forget — Resend hiccup must not block the
  // signup response. Resubscribers get the same confirmation (intentional:
  // they re-opted in, treat them as fresh).
  void sendFormConfirmationEmail({
    to: email,
    formType: 'newsletter',
    locale,
  }).catch((err) => console.error('[newsletter] welcome mail failed', err));

  return NextResponse.json({ ok: true, isNew: !existing });
}
