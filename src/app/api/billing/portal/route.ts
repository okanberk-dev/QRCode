/**
 * GET /api/billing/portal — Lemon Squeezy customer portal redirect
 * (CLAUDE.md §44.9 Wave 2).
 *
 * Owner clicks "Aboneliği yönet" → this endpoint fetches a **fresh**
 * signed portal URL from Lemon Squeezy (`attributes.urls.customer_portal`,
 * 24h JWT TTL) and returns it. Caller (frontend) redirects.
 *
 * Why fetch fresh every click instead of caching:
 *   Lemon Squeezy portal URLs are signed JWTs that expire in 24h. Storing
 *   them in DB would force ad-hoc refresh logic; cheap to fetch on demand.
 *
 * **Yapma**: storing the portal URL in BillingSubscription column. It
 * expires; cached URL = broken UX.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { resolveOwnerUserId } from '@/lib/panel-access';
import { rateLimit } from '@/lib/rate-limit';
import { getLemonSqueezyConfig, getSubscription } from '@/lib/lemon-squeezy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = await resolveOwnerUserId(actor);
  if (!userId) {
    return NextResponse.json(
      { error: 'forbidden', hint: 'portal is workspace-scoped' },
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

  // Rate limit — owner clicks portal repeatedly while waiting for redirect.
  const rl = await rateLimit(`portal:user:${userId}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: rl.retryAfterSeconds ?? 30 },
      { status: 429 },
    );
  }

  const subscription = await prisma.billingSubscription.findUnique({
    where: { userId },
    select: { providerRef: true, source: true, status: true },
  });

  if (!subscription || subscription.source !== 'lemon_squeezy' || !subscription.providerRef) {
    return NextResponse.json(
      {
        error: 'no_subscription',
        hint: 'Customer portal requires an active Lemon Squeezy subscription.',
      },
      { status: 404 },
    );
  }

  const result = await getSubscription(subscription.providerRef);
  if (!result.ok) {
    Sentry.captureMessage('Lemon Squeezy portal fetch failed', {
      level: 'warning',
      tags: { integration: 'lemon-squeezy', reason: result.reason },
      extra: { userId, status: result.status, providerRef: subscription.providerRef },
    });
    return NextResponse.json(
      {
        error: 'portal_fetch_failed',
        reason: result.reason,
        status: result.status,
      },
      { status: result.status >= 500 ? 502 : 409 },
    );
  }

  const url = result.data.data.attributes.urls?.customer_portal;
  if (!url) {
    return NextResponse.json(
      { error: 'portal_url_missing', hint: 'Lemon Squeezy returned subscription without portal URL.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, url }, { status: 200 });
}
