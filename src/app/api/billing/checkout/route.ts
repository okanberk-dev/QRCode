/**
 * POST /api/billing/checkout — Lemon Squeezy checkout session create
 * (CLAUDE.md §44.9 Wave 2).
 *
 * Flow:
 *   1. Auth (owner-scoped) + Zod `.strict()` body validation
 *   2. Rate limit 10/dk/owner (`rateLimit('checkout:user:${userId}', 10, 60_000)`)
 *   3. SubscriptionPlan lookup + paymentProvider check
 *   4. 4-slot variant resolution (USD/TRY × monthly/yearly)
 *   5. Lemon Squeezy `createCheckout` with `custom_data.user_id`
 *   6. Return signed checkout URL + variantId echo
 *
 * **Yapma**: Çoklu restaurant'lı owner için custom_data'ya restaurant_id
 * KOYMA — subscription account-level (workspace), restaurant-level değil.
 * Webhook handler `meta.custom_data.user_id` ile BillingSubscription.userId
 * resolve eder.
 *
 * **Yapma**: paymentProvider !== 'lemon_squeezy' tier'lara checkout URL
 * üretme — manual/iyzico tier'lar 409 döner; admin MemberBillingModal'dan
 * manuel yönetilir (hybrid mode §44.5).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { resolveOwnerUserId } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';
import { createCheckout, getLemonSqueezyConfig } from '@/lib/lemon-squeezy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const Body = z
  .object({
    planId: z.string().min(1).max(60),
    billingCycle: z.enum(['monthly', 'yearly']),
    currency: z.enum(['USD', 'TRY']),
    /** Optional — post-checkout redirect. Defaults to app dashboard. */
    redirectPath: z.string().regex(/^\/[a-zA-Z0-9/_-]*$/).max(200).optional(),
  })
  .strict();

type CheckoutBody = z.infer<typeof Body>;

function variantForCycleCurrency(
  plan: {
    lsVariantIdUsdMonthly: string | null;
    lsVariantIdUsdYearly: string | null;
    lsVariantIdTryMonthly: string | null;
    lsVariantIdTryYearly: string | null;
  },
  cycle: 'monthly' | 'yearly',
  currency: 'USD' | 'TRY',
): string | null {
  if (currency === 'USD' && cycle === 'monthly') return plan.lsVariantIdUsdMonthly;
  if (currency === 'USD' && cycle === 'yearly') return plan.lsVariantIdUsdYearly;
  if (currency === 'TRY' && cycle === 'monthly') return plan.lsVariantIdTryMonthly;
  if (currency === 'TRY' && cycle === 'yearly') return plan.lsVariantIdTryYearly;
  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = await resolveOwnerUserId(actor);
  if (!userId) {
    return NextResponse.json(
      { error: 'forbidden', hint: 'checkout is workspace-scoped' },
      { status: 403 },
    );
  }

  const config = getLemonSqueezyConfig();
  if (!config.enabled) {
    return NextResponse.json(
      { error: 'lemon_squeezy_disabled', reason: config.disabledReason ?? null },
      { status: 503 },
    );
  }

  // Rate limit before parsing — cheap guard against bulk checkout creation.
  const rl = await rateLimit(`checkout:user:${userId}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: rl.retryAfterSeconds ?? 60 },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds ?? 60) } },
    );
  }

  const raw = await req.json().catch(() => null);
  const parsed = validateBody<CheckoutBody>(Body, raw);
  if (!parsed.ok) return parsed.response;
  const { planId, billingCycle, currency, redirectPath } = parsed.data;

  // Plan + user lookup as a single $transaction (CLAUDE.md §40.1).
  const [plan, user] = await prisma.$transaction([
    prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        nameTr: true,
        nameEn: true,
        isActive: true,
        paymentProvider: true,
        lsVariantIdUsdMonthly: true,
        lsVariantIdUsdYearly: true,
        lsVariantIdTryMonthly: true,
        lsVariantIdTryYearly: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, locale: true },
    }),
  ]);

  if (!plan) {
    return NextResponse.json({ error: 'plan_not_found' }, { status: 404 });
  }
  if (!plan.isActive) {
    return NextResponse.json({ error: 'plan_inactive' }, { status: 409 });
  }
  if (plan.paymentProvider !== 'lemon_squeezy') {
    return NextResponse.json(
      {
        error: 'provider_mismatch',
        hint: `Plan uses '${plan.paymentProvider}' provider; checkout endpoint is Lemon Squeezy only.`,
      },
      { status: 409 },
    );
  }

  const variantId = variantForCycleCurrency(plan, billingCycle, currency);
  if (!variantId) {
    return NextResponse.json(
      {
        error: 'variant_not_configured',
        hint: `No Lemon Squeezy variant set for ${currency} ${billingCycle}. Admin must configure /admin/plans.`,
      },
      { status: 409 },
    );
  }

  if (!user) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  }

  // Build redirect URL — defansive: must be local path on our domain.
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  const safeRedirect = redirectPath && redirectPath.startsWith('/') ? redirectPath : '/dashboard/account';
  const redirectUrl = appUrl ? `${appUrl}${safeRedirect}` : undefined;

  const result = await createCheckout({
    variantId,
    customData: {
      user_id: userId,
      plan_id: plan.id,
      billing_cycle: billingCycle,
      currency,
    },
    email: user.email,
    name: user.name ?? undefined,
    redirectUrl,
  });

  if (!result.ok) {
    Sentry.captureMessage('Lemon Squeezy checkout create failed', {
      level: 'error',
      tags: {
        integration: 'lemon-squeezy',
        reason: result.reason,
        plan_id: planId.slice(0, 30),
      },
      // PII discipline (§40.4): no email, only ids + status.
      extra: { userId, planId, billingCycle, currency, status: result.status },
    });
    return NextResponse.json(
      {
        error: 'checkout_create_failed',
        reason: result.reason,
        status: result.status,
      },
      { status: result.status >= 500 ? 502 : 409 },
    );
  }

  const checkoutUrl = result.data.data.attributes.url;
  return NextResponse.json(
    {
      ok: true,
      url: checkoutUrl,
      checkoutId: result.data.data.id,
      variantId,
      planId: plan.id,
      billingCycle,
      currency,
    },
    { status: 200 },
  );
}
