import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PULSE, FONTS } from '@/lib/email/tokens';

export const dynamic = 'force-dynamic';

/**
 * One-click unsubscribe. KVKK / CAN-SPAM friendly: GET-only, requires
 * an unguessable token, idempotent (re-visit shows the same confirmation).
 *
 * Always returns HTML — never redirects, never throws. If the token is
 * invalid we still show a polite "couldn\'t find this subscription" page
 * so we don\'t leak whether the email exists.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token')?.trim() || '';
  const locale: 'tr' | 'en' = url.searchParams.get('lang') === 'en' ? 'en' : 'tr';

  if (!token || token.length < 16) {
    return htmlResponse(renderInvalid(locale));
  }

  const sub = await prisma.newsletterSubscriber.findFirst({
    where: { unsubscribeToken: token },
    select: { id: true, email: true, unsubscribedAt: true },
  });

  if (!sub) {
    return htmlResponse(renderInvalid(locale));
  }

  if (!sub.unsubscribedAt) {
    await prisma.newsletterSubscriber.update({
      where: { id: sub.id },
      data: { unsubscribedAt: new Date() },
    });
  }

  return htmlResponse(renderSuccess(locale, sub.email));
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
.eyebrow{font-family:${FONTS.mono};font-size:11px;letter-spacing:0.18em;color:${PULSE.n500};text-transform:uppercase;font-weight:500;margin-bottom:14px;}
.email{font-family:${FONTS.mono};font-size:13px;color:${PULSE.n800};background:${PULSE.n50};padding:10px 14px;border-radius:8px;margin-top:14px;display:inline-block;border:1px solid ${PULSE.n200};}
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
     <span class="email">${email}</span>
     <div><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com'}" class="btn">${isTr ? 'Anasayfaya dön →' : 'Back home →'}</a></div>`,
  );
}

function renderInvalid(locale: 'tr' | 'en'): string {
  const isTr = locale === 'tr';
  return pageShell(
    isTr ? 'Bağlantı geçersiz · Buaze' : 'Invalid link · Buaze',
    `<div class="eyebrow"><span class="dot"></span>${isTr ? 'Buaze · Bülten' : 'Buaze · Newsletter'}</div>
     <h1>${isTr ? 'Bağlantı geçersiz.' : 'Invalid link.'}</h1>
     <p>${isTr ? 'Bu bağlantı bulunamadı veya süresi dolmuş olabilir. Eğer Buaze\'den mail almak istemiyorsan herhangi bir mailimizdeki "buradan çık" bağlantısını kullanabilirsin.' : 'This link couldn\'t be found or has expired. If you no longer want emails from Buaze, use the unsubscribe link in any of our messages.'}</p>
     <div><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com'}" class="btn">${isTr ? 'Anasayfaya dön →' : 'Back home →'}</a></div>`,
  );
}
