import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getPanelActorFromRequest } from '@/lib/auth';
import { loadHostedPaymentEnvCheck } from '@/lib/billing/flags';
import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { SITE_URL } from '@/lib/site';
import { buildHostedCheckout, getPaynkolayConfig } from '@/lib/payment/paynkolay';
import { paynkolayCheckoutAmounts, toAdminRow } from '@/lib/subscription-plans';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/billing/paynkolay/checkout?planId=…&cycle=monthly|yearly&locale=tr
 *
 * Starts a card payment for one subscription period (CLAUDE.md §44): records
 * a pending BillingPayment, then answers with a page that auto-submits the
 * signed form to PayNKolay's hosted card page. Only the workspace owner pays;
 * the amount comes from the plan in the database, never from the browser.
 */
function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const locale = sp.get('locale') === 'en' ? 'en' : 'tr';
  // SITE_URL, not req.url: behind the self-host proxy req.url is the
  // container's own origin (https://localhost:3000), which the browser
  // cannot reach. The return route builds its redirects the same way.
  const accountUrl = (status: string) =>
    new URL(`/${locale}/dashboard/account?section=billing&payment=${status}`, SITE_URL);

  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.redirect(new URL(`/${locale}/auth/login?redirect=/${locale}/pricing`, SITE_URL));
  }
  // Workspace owner only — team members and admins cannot pay for a workspace.
  if (actor.source !== 'user' || actor.role !== 'restaurant_owner') {
    return NextResponse.redirect(accountUrl('owner_only'));
  }
  const cfg = getPaynkolayConfig();
  if (!cfg) return NextResponse.redirect(accountUrl('unavailable'));

  const limit = await rateLimit(`paynkolay:checkout:${actor.id}`, 10, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.redirect(accountUrl('rate_limited'));

  // D18: no payment row of an environment the database refuses (a test deployment pointed at the
  // production database, or a database bound to the other environment) is ever created.
  const envCheck = await loadHostedPaymentEnvCheck(cfg.env);
  if (!envCheck.ok) {
    Sentry.captureMessage('billing: checkout refused, PayNKolay environment does not match the database binding', {
      level: 'error',
      fingerprint: ['billing-env-mismatch'],
      tags: { billing: 'checkout' },
      extra: { reason: envCheck.reason },
    });
    return NextResponse.redirect(accountUrl('unavailable'));
  }

  const planId = (sp.get('planId') || '').trim();
  const cycle = sp.get('cycle') === 'yearly' ? 'yearly' : 'monthly';
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(planId)) return NextResponse.redirect(accountUrl('unavailable'));

  const row = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!row || !row.isActive) return NextResponse.redirect(accountUrl('unavailable'));
  // A plan smaller than the businesses the owner already has would leave
  // them over the limit right after paying (CLAUDE.md §15.2).
  if (row.maxBusinesses != null && row.maxBusinesses > 0) {
    const owned = await prisma.restaurant.count({ where: { userId: actor.id } });
    if (owned > row.maxBusinesses) return NextResponse.redirect(accountUrl('plan_too_small'));
  }
  const amounts = paynkolayCheckoutAmounts(toAdminRow(row));
  const amountTry = cycle === 'yearly' ? amounts?.yearlyTry : amounts?.monthlyTry;
  if (!amountTry) return NextResponse.redirect(accountUrl('unavailable'));

  const payment = await prisma.billingPayment.create({
    data: {
      userId: actor.id,
      subscriptionPlanId: row.id,
      billingCycle: cycle,
      amountMinor: Math.round(amountTry * 100),
      locale,
      // Binds the row to its PayNKolay environment (billing spec D18).
      providerEnv: cfg.env,
    },
    select: { id: true, amountMinor: true },
  });

  const returnUrl = `${SITE_URL}/api/billing/paynkolay/return`;
  const { action, fields } = buildHostedCheckout(cfg, {
    clientRefCode: payment.id,
    amountMinor: payment.amountMinor,
    successUrl: returnUrl,
    failUrl: returnUrl,
    buyerIp: getClientIp(req.headers),
  });

  const inputs = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${htmlEscape(k)}" value="${htmlEscape(v)}">`)
    .join('');
  const label = locale === 'en' ? 'Continue to secure payment' : 'Güvenli ödemeye devam et';
  const note =
    locale === 'en'
      ? 'You are being sent to the PayNKolay card page. Card details are entered there, not on Buaze.'
      : 'PayNKolay kart sayfasına yönlendiriliyorsunuz. Kart bilgileri Buaze’de değil, orada girilir.';
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>PayNKolay</title><style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#FAFAFA;color:#0A0A0A}main{max-width:420px;padding:24px;text-align:center}button{margin-top:16px;padding:12px 20px;border-radius:999px;border:0;background:#0A0A0A;color:#fff;font-size:15px;cursor:pointer}p{color:#525252;font-size:14px;line-height:1.5}</style></head><body><main><p>${htmlEscape(note)}</p><form id="pnk" method="post" action="${htmlEscape(action)}">${inputs}<button type="submit">${htmlEscape(label)}</button></form></main><script>document.getElementById('pnk').submit();</script></body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      // No form-action here on purpose: the POST continues to the card
      // issuer's 3D Secure page and Chrome checks form-action on redirects.
      'Content-Security-Policy':
        "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      'Referrer-Policy': 'no-referrer',
    },
  });
}
