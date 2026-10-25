import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { renderMailLandingPage } from '@/lib/email/landing-page';
import { newsletterUnsubscribeLanding } from '@/lib/email/landing-pages';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * One-click unsubscribe. KVKK / CAN-SPAM + RFC 8058 friendly:
 *  - GET: human-facing flow (link in mail body), returns confirmation HTML
 *  - POST: machine-facing flow (Gmail/Yahoo/Apple Mail "Unsubscribe" button)
 *    fires `List-Unsubscribe=One-Click` POST to the same URL — required
 *    for bulk senders (>5K mails/day, Feb-2024 ruleset)
 *
 * Both methods are idempotent and require an unguessable token.
 * Always 200 with HTML/JSON — never redirects, never throws — so an
 * invalid token doesn't leak whether the email exists.
 */
async function applyUnsubscribe(token: string): Promise<{ ok: boolean; email?: string }> {
  if (!token || token.length < 16) return { ok: false };
  const sub = await prisma.newsletterSubscriber.findFirst({
    where: { unsubscribeToken: token },
    select: { id: true, email: true, unsubscribedAt: true },
  });
  if (!sub) return { ok: false };
  if (!sub.unsubscribedAt) {
    await prisma.newsletterSubscriber.update({
      where: { id: sub.id },
      data: { unsubscribedAt: new Date() },
    });
  }
  return { ok: true, email: sub.email };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token')?.trim() || '';
  const locale: 'tr' | 'en' = url.searchParams.get('lang') === 'en' ? 'en' : 'tr';

  // IP rate limit (audit §38.B M2) — defense-in-depth against token-replay
  // hammering. Generous cap; real human clicks are unaffected.
  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`newsletter-unsubscribe:get:${ip}`, 20, 60_000);
  if (!limit.allowed) return htmlResponse(landing(locale, 'invalid'));

  const result = await applyUnsubscribe(token);
  if (!result.ok) return htmlResponse(landing(locale, 'invalid'));
  return htmlResponse(landing(locale, 'success', result.email));
}

export async function POST(req: NextRequest) {
  // RFC 8058 one-click — token comes via query string. Body is the literal
  // "List-Unsubscribe=One-Click" tag (we don't parse it; presence is implied
  // by the POST itself). Some clients also accept token in the body, so we
  // try both.
  const url = new URL(req.url);
  let token = url.searchParams.get('token')?.trim() || '';
  if (!token) {
    try {
      const ct = req.headers.get('content-type') ?? '';
      if (ct.includes('application/x-www-form-urlencoded')) {
        const form = await req.formData();
        token = String(form.get('token') ?? '').trim();
      } else if (ct.includes('application/json')) {
        const body = await req.json().catch(() => ({}));
        token = typeof body?.token === 'string' ? body.token.trim() : '';
      }
    } catch {
      /* fall through with empty token */
    }
  }

  const result = await applyUnsubscribe(token);
  if (!result.ok) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 200, // RFC 8058: bulk senders must NOT 4xx on bad tokens
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function landing(locale: 'tr' | 'en', state: 'success' | 'invalid', email?: string): string {
  return renderMailLandingPage(newsletterUnsubscribeLanding(locale, state, email));
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
