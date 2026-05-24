/**
 * POST /api/billing/cancel — Lemon Squeezy subscription soft cancel
 * (CLAUDE.md §44.9 Wave 2).
 *
 * Flow:
 *   1. Auth + owner scope
 *   2. Lookup BillingSubscription (source: 'lemon_squeezy' required)
 *   3. Call `cancelSubscription(providerRef)` → DELETE /v1/subscriptions/{id}
 *   4. Webhook `subscription_cancelled` will fire and update DB row
 *      (cancelAtPeriodEnd: true). We don't preemptively update here to
 *      avoid drift; webhook is the source of truth.
 *
 * **Yapma**: DB row'unu `delete` etmek — owner dönem sonuna kadar erişim
 * hakkı taşır (LS pattern). Cancel = "stop renewing", not "revoke now".
 * `subscription_expired` event row'u eventually canceled state'e taşır.
 *
 * **Yapma**: cancel'dan sonra preemptive `cancelAtPeriodEnd: true` set —
 * webhook 1-2 saniye sonra geliyor zaten, UI'da kullanıcıya "cancellation
 * scheduled" mesajı yeterli; double-write drift kaynağı.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { resolveOwnerUserId } from '@/lib/panel-access';
import { rateLimit } from '@/lib/rate-limit';
import { cancelSubscription, getLemonSqueezyConfig } from '@/lib/lemon-squeezy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = await resolveOwnerUserId(actor);
  if (!userId) {
    return NextResponse.json(
      { error: 'forbidden', hint: 'cancel is workspace-scoped' },
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

  const rl = await rateLimit(`cancel:user:${userId}`, 5, 60_000);
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
        hint: 'Cancel requires an active Lemon Squeezy subscription.',
      },
      { status: 404 },
    );
  }

  if (subscription.cancelAtPeriodEnd) {
    // Idempotent — already scheduled to cancel. UI can show "Aboneliğiniz
    // X tarihinde sona erecek" without re-calling LS.
    return NextResponse.json(
      { ok: true, alreadyScheduled: true },
      { status: 200 },
    );
  }

  const result = await cancelSubscription(subscription.providerRef);
  if (!result.ok) {
    Sentry.captureMessage('Lemon Squeezy subscription cancel failed', {
      level: 'warning',
      tags: { integration: 'lemon-squeezy', reason: result.reason },
      extra: { userId, status: result.status, providerRef: subscription.providerRef },
    });
    return NextResponse.json(
      {
        error: 'cancel_failed',
        reason: result.reason,
        status: result.status,
      },
      { status: result.status >= 500 ? 502 : 409 },
    );
  }

  // DB row update intentionally NOT done here — webhook subscription_cancelled
  // is the source of truth (CLAUDE.md §44.6 + comment above). LS response
  // body already shows cancelled: true + ends_at populated for UI optimism.
  return NextResponse.json(
    {
      ok: true,
      cancelledAt: new Date().toISOString(),
      endsAt: result.data.data.attributes.ends_at,
    },
    { status: 200 },
  );
}
