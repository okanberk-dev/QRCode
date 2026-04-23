// SCAFFOLDED: newsletter subscription. Wire up to Resend / Mailchimp /
// Brevo or a NewsletterSubscriber Prisma model (see scaffolding.ts once
// the model is added). Until then the endpoint returns 501 with a
// structured payload; the UI treats 501 like success so the UX stays
// intact during the scaffolding phase.
import { NextRequest } from 'next/server';
import { scaffoldedResponse } from '@/lib/scaffolding';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  let body: { email?: string; locale?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@') || email.length > 200) {
    return Response.json({ error: 'invalid_email' }, { status: 400 });
  }

  // Gentle per-IP throttle: 10 subs / 10 min.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const limit = rateLimit(`newsletter:${ip}`, 10, 10 * 60 * 1000);
  if (!limit.allowed) {
    return Response.json(
      { error: 'rate_limited', retryAfter: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  return scaffoldedResponse('src/app/api/newsletter/route.ts', {
    received: { email, locale: body.locale ?? 'tr' },
  });
}
