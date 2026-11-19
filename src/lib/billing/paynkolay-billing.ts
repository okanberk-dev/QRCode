import { prisma } from '@/lib/prisma';
import { applyPlanModulesForOwner } from '@/lib/plan-modules';
import type { PaymentCheck } from '@/lib/payment/paynkolay';

/**
 * Subscription side of a PayNKolay payment (CLAUDE.md §44). PayNKolay has no
 * recurring billing for us: each payment buys one period (a month or a year),
 * the owner extends it from the panel, and the lifecycle cron moves a lapsed
 * period to the free plan.
 */

export type BillingCycle = 'monthly' | 'yearly';

/** End of the paid period. Extends an active period instead of overlapping it. */
export function nextPeriodEnd(
  cycle: BillingCycle,
  currentEnd: Date | null,
  now: Date = new Date(),
): Date {
  const start = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  const end = new Date(start.getTime());
  if (cycle === 'yearly') end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return end;
}

function invoiceNumberFor(paymentId: string, at: Date): string {
  return `PNK-${at.getUTCFullYear()}${String(at.getUTCMonth() + 1).padStart(2, '0')}-${paymentId.slice(-8).toUpperCase()}`;
}

/**
 * Records the POS decision for a pending payment. Idempotent: a payment that
 * already succeeded is never applied twice (the return page can be reloaded
 * or POSTed again).
 */
export async function settlePaynkolayPayment(
  paymentId: string,
  check: PaymentCheck,
): Promise<'succeeded' | 'failed' | 'already'> {
  const payment = await prisma.billingPayment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      userId: true,
      subscriptionPlanId: true,
      billingCycle: true,
      amountMinor: true,
      status: true,
    },
  });
  if (!payment) return 'failed';
  if (payment.status === 'succeeded') return 'already';

  if (check.status === 'failed') {
    await prisma.billingPayment.updateMany({
      where: { id: paymentId, status: 'pending' },
      data: { status: 'failed', failureReason: check.reason.slice(0, 120), completedAt: new Date() },
    });
    return 'failed';
  }

  const now = new Date();
  const cycle: BillingCycle = payment.billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const amountMajor = payment.amountMinor / 100;

  const applied = await prisma.$transaction(async (tx) => {
    // Claim the payment first; a concurrent return for the same payment
    // finds nothing to update and stops here.
    const claimed = await tx.billingPayment.updateMany({
      where: { id: paymentId, status: { not: 'succeeded' } },
      data: {
        status: 'succeeded',
        referenceCode: check.referenceCode || null,
        failureReason: null,
        completedAt: now,
      },
    });
    if (claimed.count === 0) return false;

    const current = await tx.billingSubscription.findUnique({
      where: { userId: payment.userId },
      select: { renewsAt: true, status: true, subscriptionPlanId: true },
    });
    const sameActivePlan =
      current?.status === 'active' && current.subscriptionPlanId === payment.subscriptionPlanId;
    const renewsAt = nextPeriodEnd(cycle, sameActivePlan ? current?.renewsAt ?? null : null, now);

    await tx.billingSubscription.upsert({
      where: { userId: payment.userId },
      create: {
        userId: payment.userId,
        plan: cycle,
        status: 'active',
        renewsAt,
        subscriptionPlanId: payment.subscriptionPlanId,
        billingCycle: cycle,
        amount: amountMajor,
        currency: 'TRY',
        source: 'paynkolay',
        cancelAtPeriodEnd: false,
      },
      update: {
        plan: cycle,
        status: 'active',
        renewsAt,
        trialEndsAt: null,
        subscriptionPlanId: payment.subscriptionPlanId,
        billingCycle: cycle,
        amount: amountMajor,
        currency: 'TRY',
        source: 'paynkolay',
        cancelAtPeriodEnd: false,
      },
    });
    // `User.plan` drives the trial gate and quotas (§15.2).
    await tx.user.update({ where: { id: payment.userId }, data: { plan: cycle } });
    await tx.billingInvoice.create({
      data: {
        userId: payment.userId,
        invoiceNumber: invoiceNumberFor(payment.id, now),
        amount: amountMajor,
        currency: 'TRY',
        status: 'paid',
        providerRef: check.referenceCode || `paynkolay:${payment.id}`,
        description: cycle === 'yearly' ? 'Yıllık abonelik · PayNKolay' : 'Aylık abonelik · PayNKolay',
        source: 'paynkolay',
      },
    });
    return true;
  });

  if (!applied) return 'already';
  // Plan modules follow the paid plan; a failure here must not undo the
  // payment (the admin can re-apply from the member page).
  try {
    await applyPlanModulesForOwner(payment.userId);
  } catch (err) {
    console.error('[paynkolay] plan modules not applied', {
      userId: payment.userId,
      error: (err as Error).message,
    });
  }
  return 'succeeded';
}

/**
 * Lapsed card periods become 'expired' (no recurring charge exists); the
 * dashboard layout then sends the owner to /pricing until they pay again.
 * Called by the daily lifecycle cron. Returns how many accounts lapsed.
 */
export async function expireLapsedPaynkolayPeriods(now: Date = new Date()): Promise<number> {
  const lapsed = await prisma.billingSubscription.findMany({
    where: { source: 'paynkolay', status: 'active', renewsAt: { lt: now } },
    select: { userId: true },
    take: 500,
  });
  for (const row of lapsed) {
    await prisma.$transaction([
      prisma.billingSubscription.update({
        where: { userId: row.userId },
        data: { status: 'canceled', plan: 'expired' },
      }),
      prisma.user.update({ where: { id: row.userId }, data: { plan: 'expired' } }),
    ]);
  }
  return lapsed.length;
}
