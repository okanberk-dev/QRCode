// Stage A5 §38.97 — cross-workspace BI helper.
//
// Admin operasyonel görünüm için 4 metric aggregate:
//   1. MRR trend (last N month, plan tier breakdown)
//   2. Churn rate by month (deactivated owner / active denominator)
//   3. NPS distribution (last N day cross-workspace feedback)
//   4. Active vs trial cohort retention (kohort bazlı, signup ay'a göre)
//
// Helper saf: input window, output bucket array. CLAUDE.md §11.9 paterni
// reuse — MRR PLAN_PRICES sentinel sabiti dashboard ile aynı; Dodo Payments
// (Stage 142 §38.222) webhook invoice volume büyüdüğünde gerçek invoice
// toplamına geçilebilir.
//
// Out of scope: per-workspace breakdown, SaaS metrics dashboard
// (Baremetrics-tarzı), kohort retention curves grafiksel render. Şu an
// 4 dataset, recharts UI client component'inde render edilir.

import { prisma } from '@/lib/prisma';

// MRR sentinel prices — admin/dashboard + admin/plans ile aynı source.
// CLAUDE.md §38.32 paterni: kod-içi sentinel; Dodo Payments webhook invoice
// volume büyüdüğünde gerçek BillingInvoice toplamına geçilebilir.
export const PLAN_PRICES: Record<string, number> = {
  pro: 1499,
  growth: 899,
  starter: 499,
  monthly: 499,
  yearly: 416, // 4990 / 12 (yearly equivalent monthly)
  enterprise: 0,
};

/**
 * Resolve plan tier to monthly price using sentinel map.
 * Plan name match insensitive; trial/free → 0.
 */
function planPrice(plan: string | null | undefined): number {
  const lower = (plan || 'trial').toLowerCase();
  if (lower === 'trial' || lower === 'free') return 0;
  const matched = Object.keys(PLAN_PRICES).find((k) => lower.includes(k));
  return matched ? PLAN_PRICES[matched] : 0;
}

export interface MrrPoint {
  /** ISO YYYY-MM (e.g. 2026-04). */
  month: string;
  /** Total MRR for this month (TRY major unit). */
  total: number;
  /** Per-plan breakdown (matched sentinel keys). */
  byPlan: Record<string, number>;
}

/**
 * MRR trend by month — cohort owner.createdAt < endOfMonth, plan = current
 * plan (plan-switch history yok, today's plan ≈ past plan kabul edilir,
 * CLAUDE.md §38.32 paterni).
 *
 * Returns N month points (oldest → newest); month string format YYYY-MM.
 */
export async function getMrrTrend(months: number, now: Date = new Date()): Promise<MrrPoint[]> {
  const owners = await prisma.user.findMany({
    where: { role: 'restaurant_owner' },
    select: { plan: true, createdAt: true, isActive: true, deactivatedAt: true },
  });

  const points: MrrPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    // End of month i months ago
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthLabel = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}`;

    const byPlan: Record<string, number> = {};
    let total = 0;
    for (const o of owners) {
      // Owner exists at this month's snapshot? createdAt <= monthEnd.
      if (o.createdAt > monthEnd) continue;
      // Was active during this month? Excludes those deactivated before month.
      if (!o.isActive && o.deactivatedAt && o.deactivatedAt < monthEnd) continue;
      const price = planPrice(o.plan);
      if (price === 0) continue;
      const lower = (o.plan || '').toLowerCase();
      const matched = Object.keys(PLAN_PRICES).find((k) => lower.includes(k)) || lower;
      byPlan[matched] = (byPlan[matched] || 0) + price;
      total += price;
    }

    points.push({ month: monthLabel, total, byPlan });
  }
  return points;
}

export interface ChurnPoint {
  /** ISO YYYY-MM. */
  month: string;
  /** Deactivated owners during this month (deactivatedAt fell within). */
  churned: number;
  /** Active owners at month start (denominator). */
  active: number;
  /** Churn rate % (churned / active × 100, rounded 1dp). 0 if active=0. */
  ratePct: number;
}

/**
 * Monthly churn rate — for each month: churned = owners deactivated during
 * the month; active = owners active at month start (denominator).
 *
 * Returns N month points (oldest → newest).
 */
export async function getChurnTrend(months: number, now: Date = new Date()): Promise<ChurnPoint[]> {
  const owners = await prisma.user.findMany({
    where: { role: 'restaurant_owner' },
    select: { createdAt: true, deactivatedAt: true, isActive: true },
  });

  const points: ChurnPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthLabel = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;

    let active = 0;
    let churned = 0;
    for (const o of owners) {
      // Owner existed at month start?
      if (o.createdAt > monthStart) continue;
      // Already deactivated before month start → not in denominator.
      if (o.deactivatedAt && o.deactivatedAt < monthStart) continue;
      active += 1;
      // Deactivated during month?
      if (o.deactivatedAt && o.deactivatedAt >= monthStart && o.deactivatedAt <= monthEnd) {
        churned += 1;
      }
    }

    const ratePct = active === 0 ? 0 : Math.round((churned / active) * 1000) / 10;
    points.push({ month: monthLabel, churned, active, ratePct });
  }
  return points;
}

export interface NpsBucket {
  /** Promoters: rating === 5. */
  promoters: number;
  /** Passives: rating 3 or 4. */
  passives: number;
  /** Detractors: rating 1 or 2. */
  detractors: number;
  total: number;
  /** NPS = promoter% - detractor% (range -100..+100). 0 if total=0. */
  score: number;
}

/**
 * NPS distribution across all workspace feedback in a window.
 * Promoters (5★), passives (3-4★), detractors (1-2★) — admin/analytics
 * NPS heuristic ile aynı (CLAUDE.md §38.34).
 */
export async function getNpsDistribution(sinceDays: number, now: Date = new Date()): Promise<NpsBucket> {
  const since = new Date(now.getTime() - sinceDays * 24 * 60 * 60 * 1000);
  const groups = await prisma.feedback.groupBy({
    by: ['rating'],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });

  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  for (const g of groups) {
    const r = g.rating;
    const c = g._count._all;
    if (r === 5) promoters += c;
    else if (r >= 3) passives += c;
    else detractors += c;
  }
  const total = promoters + passives + detractors;
  if (total === 0) return { promoters: 0, passives: 0, detractors: 0, total: 0, score: 0 };
  const score = Math.round((promoters / total) * 100) - Math.round((detractors / total) * 100);
  return { promoters, passives, detractors, total, score };
}

export interface CohortPoint {
  /** Cohort signup month (YYYY-MM). */
  cohortMonth: string;
  /** Owners signed up in this month. */
  signups: number;
  /** Owners still active today (not deactivated, plan != trial). */
  retainedActive: number;
  /** Owners still on trial today (no upgrade yet). */
  retainedTrial: number;
  /** Retention rate % (active+trial)/signups, rounded 1dp. */
  retentionPct: number;
}

/**
 * Cohort retention — by signup month, count how many are still active today.
 * "Active" = isActive=true AND plan != trial; "trial" = still on trial.
 * Helper saf: tek owner.findMany çağrısı + JS-side bucket.
 */
export async function getCohortRetention(months: number, now: Date = new Date()): Promise<CohortPoint[]> {
  const owners = await prisma.user.findMany({
    where: { role: 'restaurant_owner' },
    select: { createdAt: true, plan: true, isActive: true, trialEndsAt: true },
  });

  const points: CohortPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthLabel = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;

    let signups = 0;
    let retainedActive = 0;
    let retainedTrial = 0;
    for (const o of owners) {
      if (o.createdAt < monthStart || o.createdAt > monthEnd) continue;
      signups += 1;
      if (!o.isActive) continue;
      const plan = (o.plan || 'trial').toLowerCase();
      if (plan === 'trial') retainedTrial += 1;
      else if (plan !== 'free') retainedActive += 1;
    }

    const retained = retainedActive + retainedTrial;
    const retentionPct = signups === 0 ? 0 : Math.round((retained / signups) * 1000) / 10;
    points.push({ cohortMonth: monthLabel, signups, retainedActive, retainedTrial, retentionPct });
  }
  return points;
}

export interface BiSnapshot {
  range: '30d' | '90d' | '1y';
  /** Range in months for monthly buckets. */
  months: number;
  mrr: MrrPoint[];
  churn: ChurnPoint[];
  nps: NpsBucket;
  cohort: CohortPoint[];
  generatedAt: string;
}

/**
 * Convenience aggregator — calls 4 helpers in parallel. Used by the BI
 * endpoint + CSV export. Returns a single snapshot.
 */
export async function getBiSnapshot(range: '30d' | '90d' | '1y'): Promise<BiSnapshot> {
  const months = range === '30d' ? 6 : range === '90d' ? 12 : 12; // 1y = 12 months chart
  const npsDays = range === '30d' ? 30 : range === '90d' ? 90 : 365;
  const now = new Date();
  const [mrr, churn, nps, cohort] = await Promise.all([
    getMrrTrend(months, now),
    getChurnTrend(months, now),
    getNpsDistribution(npsDays, now),
    getCohortRetention(months, now),
  ]);
  return {
    range,
    months,
    mrr,
    churn,
    nps,
    cohort,
    generatedAt: now.toISOString(),
  };
}
