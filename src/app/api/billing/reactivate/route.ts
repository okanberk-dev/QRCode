/**
 * POST /api/billing/reactivate — Re-activate a scheduled-cancel Lemon Squeezy
 * subscription (CLAUDE.md §44.9 Wave 2).
 *
 * Owner clicked "Aboneliği iptal et", later changed mind. As long as the
 * grace period (`ends_at`) hasn't elapsed, LS allows `PATCH cancelled:false`
 * to restore the renewal. After `ends_at`, subscription is `expired` and
 * owner must re-checkout.
 *
 * Webhook `subscription_resumed` updates DB `cancelAtPeriodEnd: false`.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { resolveOwnerUserId } from '@/lib/panel-access';
import { rateLimit } from '@/lib/rate-limit';
import { getLemonSqueezyConfig, reactivateSubscription } from '@/lib/lemon-squeezy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = await resolveOwnerUserId(actor);
  if (!userId) {
    return NextResponse.json(
      { error: 'forbidden', hint: 'reactivate is workspace-scoped' },
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

  const rl = await rateLimit(`reactivate:user:${userId}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: rl.retryAfterSeconds ?? 60 },
      { status: 429 },
    );
  }

  const subscription = await prisma.billingSubscription.findUnique({
    where: { userId },
    select: {
      providerRef: true,
      source: true,
      cancelAtPeriodEnd: true,
      status: true,
    },
  });

  if (!subscription || subscription.source !== 'lemon_squeezy' || !subscription.providerRef) {
    return NextResponse.json(
      {
        error: 'no_subscription',
        hint: 'Reactivate requires a Lemon Squeezy subscription in grace period.',
      },
      { status: 404 },
    );
  }

  if (!subscription.cancelAtPeriodEnd) {
    // Idempotent — already active. UI shouldn't have shown the button but
    // be resilient to race (user open two tabs, cancel + reactivate).
    return NextResponse.json(
      { ok: true, alreadyActive: true },
      { status: 200 },
    );
  }

  const result = await reactivateSubscription(subscription.providerRef);
  if (!result.ok) {
    Sentry.captureMessage('Lemon Squeezy subscription reactivate failed', {
      level: 'warning',
      tags: { integration: 'lemon-squeezy', reason: result.reason },
      extra: { userId, status: result.status, providerRef: subscription.providerRef },
    });
    return NextResponse.json(
      {
        error: 'reactivate_failed',
        reason: result.reason,
        status: result.status,
      },
      { status: result.status >= 500 ? 502 : 409 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      renewsAt: result.data.data.attributes.renews_at,
    },
    { status: 200 },
  );
}
