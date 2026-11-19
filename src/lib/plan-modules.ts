import { prisma } from '@/lib/prisma';
import { revalidatePublicMenu } from '@/lib/restaurant-revalidate';

import { moduleSwitches } from '@/lib/plan-modules-catalog';

export {
  PLAN_MODULES,
  isPlanModuleKey,
  moduleSwitches,
  normalizeModuleKeys,
  type PlanModuleKey,
} from '@/lib/plan-modules-catalog';

/**
 * Applies the owner's current plan to all of their businesses. No-op when
 * the owner has no plan or the plan does not manage modules. Returns the
 * number of businesses updated.
 */
export async function applyPlanModulesForOwner(userId: string): Promise<number> {
  const sub = await prisma.billingSubscription.findUnique({
    where: { userId },
    select: {
      status: true,
      subscriptionPlan: { select: { modulesManaged: true, moduleKeys: true } },
    },
  });
  const plan = sub?.subscriptionPlan;
  if (!plan || !plan.modulesManaged || sub?.status !== 'active') return 0;

  const switches = moduleSwitches(plan.moduleKeys);
  const restaurants = await prisma.restaurant.findMany({
    where: { userId },
    select: { id: true, slug: true },
  });
  if (restaurants.length === 0) return 0;
  const ids = restaurants.map((r) => r.id);

  await prisma.$transaction([
    prisma.restaurant.updateMany({
      where: { id: { in: ids } },
      // Turning the menu off also unpublishes it (same rule as the admin switch).
      data: switches.menuEnabled ? switches : { ...switches, menuPublished: false },
    }),
    // Pulse AI off: pending drafts would keep showing in the inbox.
    ...(switches.pulseAiEnabled
      ? []
      : [prisma.feedbackAiDraft.deleteMany({ where: { feedback: { restaurantId: { in: ids } } } })]),
  ]);
  for (const r of restaurants) revalidatePublicMenu(r.slug);
  return restaurants.length;
}

/** Re-applies a plan to every active subscriber after the plan was edited. */
export async function applyPlanModulesForPlan(planId: string): Promise<number> {
  const subs = await prisma.billingSubscription.findMany({
    where: { subscriptionPlanId: planId, status: 'active' },
    select: { userId: true },
    take: 2000,
  });
  let total = 0;
  for (const s of subs) total += await applyPlanModulesForOwner(s.userId);
  return total;
}
