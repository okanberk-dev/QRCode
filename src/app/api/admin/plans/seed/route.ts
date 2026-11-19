import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiErrors } from '@/lib/api-errors';
import { getAdminFromRequest } from '@/lib/auth';
import { revalidatePricing } from '@/lib/marketing-revalidate';
import { PLAN_CATALOG, catalogPlanData } from '@/lib/plan-catalog';
import { applyPlanModulesForPlan } from '@/lib/plan-modules';

// Recommended lineup from src/lib/plan-catalog.ts (CLAUDE.md §15.2).
// Without `force` an existing table is left alone. With `force`, the three
// tiers are updated in place (matched by English name, so subscription links
// keep their plan id) and missing tiers are created; nothing is deleted.
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const body = await req.json().catch(() => ({}));
  const force = body?.force === true;

  try {
    const existing = await prisma.subscriptionPlan.count();
    if (existing > 0 && !force) {
      return NextResponse.json({
        success: true,
        skipped: true,
        existing,
        message:
          'Tablo zaten dolu (admin değişikliklerini korumak için no-op). Önerilen yapıyı uygulamak için { force: true } gönderin.',
      });
    }

    const rows = await prisma.subscriptionPlan.findMany({ select: { id: true, nameEn: true } });
    let created = 0;
    let updated = 0;
    const touched: string[] = [];
    for (const plan of PLAN_CATALOG) {
      const data = catalogPlanData(plan);
      const matches = rows.filter((r) => plan.matchNames.includes(r.nameEn.trim().toLowerCase()));
      if (matches.length === 0) {
        const row = await prisma.subscriptionPlan.create({ data, select: { id: true } });
        touched.push(row.id);
        created++;
        continue;
      }
      for (const match of matches) {
        await prisma.subscriptionPlan.update({ where: { id: match.id }, data, select: { id: true } });
        touched.push(match.id);
        updated++;
      }
    }
    // Owners already on these plans get the plan's modules.
    for (const id of touched) {
      await applyPlanModulesForPlan(id).catch((err: Error) =>
        console.error('[plans seed] modules not applied', { planId: id, error: err.message }),
      );
    }
    revalidatePricing();
    return NextResponse.json({ success: true, created, updated, force });
  } catch (error) {
    console.error('[plans seed] failed', error);
    return ApiErrors.internalError('Planlar örneklenemedi');
  }
}
