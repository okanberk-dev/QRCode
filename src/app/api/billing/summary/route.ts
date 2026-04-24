import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { PLAN_QUOTA, PLAN_LABELS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

async function resolveOwnerUserId(actor: {
  id: string;
  role: string;
  restaurantId: string | null;
  source: 'admin' | 'user';
}): Promise<string | null> {
  if (actor.source === 'user') return actor.id;
  if (actor.role === 'manager' && actor.restaurantId) {
    const r = await prisma.restaurant.findUnique({
      where: { id: actor.restaurantId },
      select: { userId: true },
    });
    return r?.userId ?? null;
  }
  return null;
}

function trialDaysLeft(trialEndsAt: Date | null | undefined): number | null {
  if (!trialEndsAt) return null;
  const ms = trialEndsAt.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = await resolveOwnerUserId(actor);
  if (!userId) {
    return NextResponse.json({ error: 'forbidden', hint: 'billing is workspace-scoped' }, { status: 403 });
  }

  const [user, subscription, restaurants] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, trialEndsAt: true, locale: true },
    }),
    prisma.billingSubscription.findUnique({ where: { userId } }),
    prisma.restaurant.findMany({
      where: { userId },
      select: { id: true },
    }),
  ]);

  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  // BillingSubscription is source of truth once present; fall back to User.plan
  // for trial users who haven't hit checkout yet.
  const plan = subscription?.plan ?? user.plan ?? 'trial';
  const locale = user.locale === 'en' ? 'en' : 'tr';
  const planLabel = PLAN_LABELS[plan]?.[locale] ?? plan;
  const renewsAt = subscription?.renewsAt ?? null;

  // Prefer the subscription's own trial end (payment provider will set it
  // once checkout succeeds), fall back to the User's onboarding trial.
  const trialEnd = subscription?.trialEndsAt ?? user.trialEndsAt ?? null;
  const isTrial = plan === 'trial';

  // Usage: feedback rows across every restaurant owned by this user,
  // month-to-date window.
  const restaurantIds = restaurants.map((r) => r.id);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const used =
    restaurantIds.length === 0
      ? 0
      : await prisma.feedback.count({
          where: {
            restaurantId: { in: restaurantIds },
            createdAt: { gte: monthStart },
          },
        });

  const limit = PLAN_QUOTA[plan] ?? PLAN_QUOTA.trial;

  const paymentMethod =
    subscription?.paymentBrand && subscription?.paymentLast4
      ? { brand: subscription.paymentBrand, last4: subscription.paymentLast4 }
      : null;

  return NextResponse.json({
    plan,
    planLabel,
    status: subscription?.status ?? 'active',
    trialDaysLeft: isTrial ? trialDaysLeft(trialEnd) : null,
    renewsAt: renewsAt ? renewsAt.toISOString() : null,
    quota: { used, limit },
    paymentMethod,
  });
}
