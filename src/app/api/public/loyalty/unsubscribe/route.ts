// One-click opt-out from a business's loyalty e-mails (CLAUDE.md §61,
// 6563 ETK). GET shows a confirm button (mail scanners open links, so GET
// never changes anything); POST — the button or a mail provider's
// List-Unsubscribe-Post one-click — withdraws the marketing consent. The
// signed link is the authorisation (no cookie, no cross-site check: mail
// providers post from their own servers).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { escapeHtml } from '@/lib/email/escape';
import { verifyLoyaltyUnsubscribe } from '@/lib/loyalty-unsubscribe';

export const dynamic = 'force-dynamic';

function page(title: string, body: string, form?: { action: string; label: string }): NextResponse {
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title>
<style>body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#FAFAFA;color:#0A0A0A}main{max-width:440px;margin:12vh auto;padding:28px 24px;background:#fff;border:1px solid #EDEDED;border-radius:16px}h1{font-size:22px;margin:0 0 10px}p{font-size:15px;line-height:1.55;color:#404040;margin:0}button{margin-top:20px;width:100%;min-height:48px;border:0;border-radius:12px;background:#0A0A0A;color:#fff;font-size:15px;font-weight:600;cursor:pointer}</style></head>
<body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p>${form ? `<form method="post" action="${escapeHtml(form.action)}"><button type="submit">${escapeHtml(form.label)}</button></form>` : ''}</main></body></html>`;
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' },
  });
}

async function lookup(req: NextRequest) {
  const m = req.nextUrl.searchParams.get('m') ?? '';
  const s = req.nextUrl.searchParams.get('s') ?? '';
  if (!verifyLoyaltyUnsubscribe(m, s)) return null;
  return prisma.loyaltyMember.findUnique({
    where: { id: m },
    select: { id: true, marketingConsent: true, program: { select: { restaurant: { select: { name: true } } } } },
  });
}

export async function GET(req: NextRequest) {
  const member = await lookup(req);
  if (!member) return page('Bağlantı geçersiz', 'Bu bağlantı geçersiz ya da kart silinmiş. Kart silindiyse size e-posta gönderilmez.');
  const business = member.program.restaurant.name;
  if (!member.marketingConsent) return page('Zaten ayrıldınız', `${business} size artık kampanya e-postası göndermez.`);
  return page(
    'E-postalardan ayrılın',
    `${business} sadakat programının kampanya e-postalarını artık almayacaksınız. Kartınız ve biriktirdikleriniz silinmez.`,
    { action: `${req.nextUrl.pathname}${req.nextUrl.search}`, label: 'E-postalardan ayrıl' },
  );
}

export async function POST(req: NextRequest) {
  const limit = await rateLimit(`loyalty-unsub:ip:${getClientIp(req.headers)}`, 60, 60 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'rate_limit' }, { status: 429 });
  const member = await lookup(req);
  if (!member) return page('Bağlantı geçersiz', 'Bu bağlantı geçersiz ya da kart silinmiş.');
  if (member.marketingConsent) {
    await prisma.loyaltyMember.update({
      where: { id: member.id },
      data: { marketingConsent: false, marketingOptOutAt: new Date() },
    });
  }
  return page('Ayrıldınız', `${member.program.restaurant.name} size artık kampanya e-postası göndermez. Kartınız ve biriktirdikleriniz duruyor.`);
}
