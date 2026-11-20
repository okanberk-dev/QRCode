import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getPanelActorFromRequest } from '@/lib/auth';
import { loadCardVaultDeps } from '@/lib/billing/card-vault';
import { interstitialHeaders, renderCheckoutInterstitial } from '@/lib/billing/checkout-interstitial';
import { checkoutPostCore, parseCheckoutForm } from '@/lib/billing/checkout-post';
import { loadBillingFlags, loadHostedPaymentEnvCheck } from '@/lib/billing/flags';
import { allowedBillingOrigins } from '@/lib/billing/owner-guard';
import { safeError } from '@/lib/billing/redact';
import { checkoutIpBlockKey } from '@/lib/billing/return-flow';
import { getTrustedClientIp } from '@/lib/client-ip';
import { prisma } from '@/lib/prisma';
import { isBlocked, rateLimit } from '@/lib/rate-limit';
import { isRecaptchaServerConfigured } from '@/lib/recaptcha';
import { SITE_URL } from '@/lib/site';
import { buildHostedCheckout, getPaynkolayConfig } from '@/lib/payment/paynkolay';
import { paynkolayCheckoutAmounts, toAdminRow } from '@/lib/subscription-plans';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PayNKolay checkout (CLAUDE.md §44, billing spec §8.4).
 *
 * GET  ?planId=…&cycle=monthly|yearly&locale=tr — the links on /pricing and
 *      in the plan picker. With saved cards on (PAYNKOLAY_CARD_STORAGE) it
 *      303s to the review page (`/billing/{locale}/checkout`), where the owner
 *      can choose to save the card. Otherwise it is the original one-step
 *      flow: a pending BillingPayment and the hand-off page.
 * POST — the review page's form (checkoutPostCore): card-testing controls,
 *      card-save consent, owner_paying lock, then the hand-off page.
 *
 * The amount always comes from the plan in the database. The hand-off page
 * carries its own hash-based CSP (the site CSP is not applied to this path,
 * next.config.ts, because Chrome checks form-action on the 3D Secure
 * redirect chain).
 */

function htmlResponse(html: string): NextResponse {
  return new NextResponse(html, { status: 200, headers: interstitialHeaders() });
}

function seeOther(path: string): NextResponse {
  const res = NextResponse.redirect(new URL(path, SITE_URL), 303);
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const locale = sp.get('locale') === 'en' ? 'en' : 'tr';
  // SITE_URL, not req.url: behind the self-host proxy req.url is the
  // container's own origin (https://localhost:3000), which the browser
  // cannot reach. The return route builds its redirects the same way.
  const accountUrl = (status: string) =>
    new URL(`/${locale}/dashboard/account?section=billing&payment=${status}`, SITE_URL);
  const planId = (sp.get('planId') || '').trim();
  const cycle = sp.get('cycle') === 'yearly' ? 'yearly' : 'monthly';

  const flags = await loadBillingFlags();
  if (flags.cardStorage) {
    // Saved cards: the review page shows the order, the save option and its consent before the hand-off.
    const qs = new URLSearchParams({ cycle });
    if (/^[A-Za-z0-9_-]{1,64}$/.test(planId)) qs.set('planId', planId);
    return seeOther(`/billing/${locale}/checkout?${qs.toString()}`);
  }

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
    buyerIp: getTrustedClientIp(req.headers),
  });

  return htmlResponse(
    renderCheckoutInterstitial({
      action,
      fields,
      locale,
      summary: {
        planName: locale === 'en' ? row.nameEn : row.nameTr,
        cycle,
        amountMinor: payment.amountMinor,
        saveCard: false,
        autoRenewFrom: null,
        intent: 'new',
      },
      backUrl: `/${locale}/dashboard/account?section=billing`,
    }),
  );
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? '';
  let form: FormData | null = null;
  if (contentType.startsWith('application/x-www-form-urlencoded') || contentType.startsWith('multipart/form-data')) {
    try {
      form = await req.formData();
    } catch {
      form = null;
    }
  }
  const read = (name: string) => {
    const value = form?.get(name);
    return typeof value === 'string' ? value.slice(0, 256) : null;
  };
  const parsed = parseCheckoutForm(read);
  if (!form) return seeOther(`/billing/${parsed.locale}/checkout?error=unavailable`);

  const flags = await loadBillingFlags();
  const origin = req.headers.get('origin');
  const ip = getTrustedClientIp(req.headers);
  try {
    const outcome = await checkoutPostCore(
      {
        db: prisma,
        cfg: getPaynkolayConfig(),
        flags,
        vault: flags.cardStorage ? await loadCardVaultDeps() : null,
        envCheck: (env) => loadHostedPaymentEnvCheck(env),
        rateLimit,
        isIpBlocked: (value) => isBlocked(checkoutIpBlockKey(value)),
        recaptchaConfigured: isRecaptchaServerConfigured(),
        siteUrl: SITE_URL,
        now: () => new Date(),
        capture: (message, fingerprint, extra) =>
          Sentry.captureMessage(message, { level: 'error', fingerprint: [fingerprint], tags: { billing: 'checkout' }, extra }),
      },
      {
        actor: await getPanelActorFromRequest(req),
        originOk: !!origin && allowedBillingOrigins(req.nextUrl.origin).includes(origin),
        ip,
        userAgent: req.headers.get('user-agent'),
      },
      parsed,
    );
    if (outcome.kind === 'redirect') return seeOther(outcome.location);
    return htmlResponse(outcome.html);
  } catch (err) {
    Sentry.captureException(safeError(err, 'checkout'), { tags: { billing: 'checkout' } });
    return seeOther(`/billing/${parsed.locale}/checkout?error=unavailable`);
  }
}
