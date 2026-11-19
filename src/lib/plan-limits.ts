import { prisma } from '@/lib/prisma';

/**
 * Business limits per plan (CLAUDE.md §15.2 "Paket stratejisi").
 *
 * `SubscriptionPlan.maxBusinesses` caps how many businesses an owner with an
 * active subscription on that plan may have. Owners on a trial, on a manual
 * plan without a linked tier, or on a plan with no limit are not capped.
 * Admins can always add businesses; existing businesses are never removed.
 */

export interface OwnerBusinessLimit {
  maxBusinesses: number;
  planNameTr: string;
  planNameEn: string;
}

/** Pure check (tests/plan-limits.test.ts). */
export function isBusinessLimitReached(currentCount: number, maxBusinesses: number | null | undefined): boolean {
  if (maxBusinesses == null || !Number.isFinite(maxBusinesses) || maxBusinesses <= 0) return false;
  return currentCount >= maxBusinesses;
}

/** Owner's business cap from the active subscription's plan; null = no cap. */
export async function getOwnerBusinessLimit(ownerUserId: string): Promise<OwnerBusinessLimit | null> {
  const sub = await prisma.billingSubscription.findUnique({
    where: { userId: ownerUserId },
    select: {
      status: true,
      subscriptionPlan: { select: { maxBusinesses: true, nameTr: true, nameEn: true } },
    },
  });
  const plan = sub?.subscriptionPlan;
  if (!sub || sub.status !== 'active' || !plan || plan.maxBusinesses == null || plan.maxBusinesses <= 0) {
    return null;
  }
  return { maxBusinesses: plan.maxBusinesses, planNameTr: plan.nameTr, planNameEn: plan.nameEn };
}

export function ownerBusinessCount(ownerUserId: string): Promise<number> {
  return prisma.restaurant.count({ where: { userId: ownerUserId } });
}

/** Message for the PLAN_BUSINESS_LIMIT error (owner panel + API). */
export function businessLimitMessage(limit: OwnerBusinessLimit, locale: 'tr' | 'en' = 'tr'): string {
  return locale === 'en'
    ? `Your ${limit.planNameEn} plan covers ${limit.maxBusinesses} ${limit.maxBusinesses === 1 ? 'business' : 'businesses'}. Upgrade your plan to add another.`
    : `${limit.planNameTr} planınız ${limit.maxBusinesses} işletmeyi kapsıyor. Yeni işletme eklemek için planınızı yükseltin.`;
}
