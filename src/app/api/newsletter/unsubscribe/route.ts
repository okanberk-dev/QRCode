import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PULSE, FONTS } from '@/lib/email/tokens';
import { escapeHtml } from '@/lib/email/escape';
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
  if (!limit.allowed) return htmlResponse(renderInvalid(locale));

  const result = await applyUnsubscribe(token);
  if (!result.ok) return htmlResponse(renderInvalid(locale));
  return htmlResponse(renderSuccess(locale, result.email!));
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

function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function pageShell(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap');
body{margin:0;background:${PULSE.n100};font-family:${FONTS.body};color:${PULSE.graphite};min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
.card{background:${PULSE.pure};border-radius:16px;padding:36px 28px;max-width:480px;width:100%;border:1px solid ${PULSE.n200};box-shadow:0 8px 24px rgba(0,0,0,0.04);}
h1{font-family:${FONTS.heading};font-size:28px;font-weight:500;margin:0 0 12px;letter-spacing:-0.02em;}
p{font-size:15px;line-height:1.6;color:${PULSE.n700};margin:0 0 8px;}
.eyebrow{font-family:${FONTS.label};font-size:11px;letter-spacing:0.18em;color:${PULSE.n500};text-transform:uppercase;font-weight:500;margin-bottom:14px;}
.email{font-family:${FONTS.label};font-size:13px;color:${PULSE.n800};background:${PULSE.n50};padding:10px 14px;border-radius:8px;margin-top:14px;display:inline-block;border:1px solid ${PULSE.n200};}
.btn{display:inline-block;background:${PULSE.graphite};color:${PULSE.pure};padding:14px 24px;border-radius:10px;font-weight:600;text-decoration:none;font-size:14px;margin-top:22px;}
.dot{display:inline-block;width:10px;height:10px;background:${PULSE.lime};border-radius:50%;margin-right:8px;vertical-align:middle;}
@media (max-width:480px){h1{font-size:24px;}.card{padding:28px 22px;}}
</style></head><body><div class="card">${body}</div></body></html>`;
}

function renderSuccess(locale: 'tr' | 'en', email: string): string {
  const isTr = locale === 'tr';
  return pageShell(
    isTr ? 'Aboneliğin sonlandı · Buaze' : 'Unsubscribed · Buaze',
    `<div class="eyebrow"><span class="dot"></span>${isTr ? 'Buaze · Bülten' : 'Buaze · Newsletter'}</div>
     <h1>${isTr ? 'Aboneliğin sonlandı.' : 'You\'re unsubscribed.'}</h1>
     <p>${isTr ? 'Bundan sonra Pulse aylık bültenini almayacaksın. Fikrini değiştirirsen sitedeki abone formundan tekrar katılabilirsin.' : 'You\'ll no longer receive the Pulse monthly digest. If you change your mind, sign up again from any newsletter form on the site.'}</p>
     <span class="email">${escapeHtml(email)}</span>
     <div><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com'}" class="btn">${isTr ? 'Anasayfaya dön →' : 'Back home →'}</a></div>`,
  );
}

function renderInvalid(locale: 'tr' | 'en'): string {
  const isTr = locale === 'tr';
  return pageShell(
    isTr ? 'Bağlantı geçersiz · Buaze' : 'Invalid link · Buaze',
    `<div class="eyebrow"><span class="dot"></span>${isTr ? 'Buaze · Bülten' : 'Buaze · Newsletter'}</div>
     <h1>${isTr ? 'Bağlantı geçersiz.' : 'Invalid link.'}</h1>
     <p>${isTr ? 'Bu bağlantı bulunamadı veya süresi dolmuş olabilir. Eğer Buaze\'den mail almak istemiyorsan herhangi bir mailimizdeki "buradan çık" bağlantısını kullanabilirsin.' : 'This link couldn\'t be found or has expired. If you no longer want emails from Buaze, use the unsubscribe link in any of our messages.'}</p>
     <div><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com'}" class="btn">${isTr ? 'Anasayfaya dön →' : 'Back home →'}</a></div>`,
  );
}
