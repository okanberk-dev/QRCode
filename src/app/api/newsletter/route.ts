import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { verifyRecaptchaToken } from '@/lib/recaptcha';
import { sendFormConfirmationEmail } from '@/lib/email';
import { isValidEmail } from '@/lib/validations';
import { recordConsentBatch } from '@/lib/legal/consent';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: {
    email?: string;
    locale?: string;
    source?: string;
    recaptchaToken?: string;
    consent?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  const email = (body.email ?? '').trim().toLowerCase();
  // Stricter format validation than the old `includes('@')` (audit §38.B M2):
  // rejects whitespace / multiple `@` / missing TLD. The definitive XSS fix is
  // escapeHtml at the unsubscribe-page sink (that page reflects this value);
  // this is defense-in-depth on the stored data.
  if (!email || !isValidEmail(email) || email.length > 200) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  // The newsletter is a commercial electronic message (6563 sayılı Kanun):
  // subscribing needs an explicit, unticked-by-default consent box. The
  // sign-up form sends `consent: true` only when the visitor ticked it.
  if (body.consent !== true) {
    return NextResponse.json({ error: 'consent_required' }, { status: 400 });
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

  // Token is the one-click unsubscribe credential embedded in every
  // marketing email. We rotate it on every (re)subscribe so a leaked token
  // from an old email can't be replayed by a third party to silently
  // unsubscribe the user. Mail-client URL preview ages tokens in the wild;
  // the freshest mail always carries the current token.
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
      unsubscribeToken: newToken,
    },
  });

  // Audit trail for the consent given above (who, which document version,
  // when, from where) — the proof of opt-in for commercial e-mail. Awaited so
  // the serverless function cannot freeze before it is written; it never
  // throws (recordConsent logs and swallows its own errors).
  await recordConsentBatch(
    {
      locale,
      subjectType: 'email',
      subjectId: email,
      source: 'newsletter',
      ipAddress: ip,
      userAgent: req.headers.get('user-agent'),
    },
    [{ key: 'ticari-ileti', granted: true }, { key: 'kvkk-aydinlatma', granted: true }],
  );

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
