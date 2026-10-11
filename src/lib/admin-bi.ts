// Stage A5 §38.97 — cross-workspace BI helper.
//
// Admin operasyonel görünüm için 4 metric aggregate:
//   1. MRR trend (last N month, plan tier breakdown)
//   2. Churn rate by month (deactivated owner / active denominator)
//   3. NPS distribution (last N day cross-workspace feedback)
//   4. Active vs trial cohort retention (kohort bazlı, signup ay'a göre)
//
// Gelir (MRR) kanonik kaynağı CLAUDE.md §15.2: `BillingSubscription`
// (subscriptionPlanId + billingCycle + admin `amount` override) →
// `resolveBillingAmount`. `User.plan` tier değil, lifecycle kovası
// (trial | monthly | yearly | enterprise | free) — tier adıyla eşleştirme
// yapılmaz. Fiyatlandırma USD-only (§38.225).
//
// /admin/dashboard + /admin/plans + BI section aynı helper'ları kullanır,
// üç yüzey aynı MRR / plan dağılımını gösterir.

import { prisma } from '@/lib/prisma';
import { calculateNPSFromCounts } from '@/lib/analytics-nps';
import { csvCell } from '@/lib/csv-safe';
import { resolveBillingAmount, toAdminRow, type AdminPlanRow } from '@/lib/subscription-plans';

// ─── Canonical revenue + plan classification (§15.2) ──────────────────

/** `User.plan` / `BillingSubscription.plan` lifecycle buckets that mean "paying". */
export const PAID_PLAN_BUCKETS: readonly string[] = ['monthly', 'yearly', 'enterprise'];

/** Subscription statuses that still hold a paid tier (past_due = payment retrying). */
const PAID_SUBSCRIPTION_STATUSES = new Set(['active', 'past_due']);

/** Prisma `select` shape the revenue helpers need from `BillingSubscription`. */
export const REVENUE_SUBSCRIPTION_SELECT = {
  userId: true,
  plan: true,
  status: true,
  amount: true,
  currency: true,
  billingCycle: true,
  subscriptionPlanId: true,
} as const;

export interface RevenueSubscription {
  userId: string;
  plan: string | null;
  status: string | null;
  /** Prisma Decimal | number | null — admin override (per billing cycle). */
  amount: { toString(): string } | number | null;
  currency: string | null;
  billingCycle: string | null;
  subscriptionPlanId: string | null;
}

export interface RevenueOwner {
  id: string;
  plan: string | null;
  trialEndsAt: Date | null;
}

function normalizeCycle(cycle: string | null | undefined): 'monthly' | 'yearly' | null {
  return cycle === 'monthly' || cycle === 'yearly' ? cycle : null;
}

/** Does this subscription row represent a paying (paid-tier) customer? */
export function isPaidSubscription(sub: Pick<RevenueSubscription, 'plan' | 'status'>): boolean {
  const plan = (sub.plan || '').toLowerCase();
  if (plan === 'trial' || plan === 'free') return false;
  return PAID_SUBSCRIPTION_STATUSES.has((sub.status || 'active').toLowerCase());
}

/**
 * Monthly recurring USD of one subscription (§15.2 precedence):
 *   1. Admin `amount` override (USD only — per billing cycle, yearly ÷ 12)
 *   2. Tier-derived canonical price via `resolveBillingAmount`
 *   3. Otherwise unpriced (`null`) — e.g. a legacy TRY override with no tier.
 */
export function subscriptionMonthlyUsd(
  sub: RevenueSubscription,
  tier: AdminPlanRow | null,
): number | null {
  const cycle = normalizeCycle(sub.billingCycle);
  const override = sub.amount == null ? null : Number(sub.amount.toString());
  const currency = (sub.currency || '').toUpperCase();
  if (override != null && Number.isFinite(override) && override > 0 && currency === 'USD') {
    const effectiveCycle = cycle ?? (tier?.period === 'year' ? 'yearly' : 'monthly');
    return effectiveCycle === 'yearly' ? override / 12 : override;
  }
  if (tier) {
    const resolved = resolveBillingAmount(tier, cycle, 'USD');
    return resolved.amountMonthly;
  }
  return null;
}

export interface RevenueSummary {
  /** Monthly recurring revenue in USD (major unit, 2-decimal rounded). */
  mrrUsd: number;
  /** Subscriptions with status `active` on a paid bucket. */
  activeSubscriptions: number;
  /** Active paid subscriptions without a USD price (no tier + non-USD override). */
  unpricedSubscriptions: number;
  /** Paid subscriptions (active + past_due) per SubscriptionPlan id. */
  usageByPlanId: Record<string, number>;
}

/**
 * Pure MRR + per-tier usage summary. Only `status === 'active'` counts toward
 * MRR (past_due is not collecting); per-tier usage counts every subscriber that
 * still holds the tier (active + past_due).
 */
export function summarizeRevenue(
  subscriptions: RevenueSubscription[],
  tiersById: Map<string, AdminPlanRow>,
): RevenueSummary {
  let mrr = 0;
  let activeSubscriptions = 0;
  let unpricedSubscriptions = 0;
  const usageByPlanId: Record<string, number> = {};
  for (const sub of subscriptions) {
    if (!isPaidSubscription(sub)) continue;
    const tier = sub.subscriptionPlanId ? tiersById.get(sub.subscriptionPlanId) ?? null : null;
    if (sub.subscriptionPlanId) {
      usageByPlanId[sub.subscriptionPlanId] = (usageByPlanId[sub.subscriptionPlanId] ?? 0) + 1;
    }
    if ((sub.status || 'active').toLowerCase() !== 'active') continue;
    activeSubscriptions += 1;
    const monthly = subscriptionMonthlyUsd(sub, tier);
    if (monthly == null) unpricedSubscriptions += 1;
    else mrr += monthly;
  }
  return {
    mrrUsd: Math.round(mrr * 100) / 100,
    activeSubscriptions,
    unpricedSubscriptions,
    usageByPlanId,
  };
}

export type OwnerPlanState = 'paid' | 'trial' | 'trial_expired' | 'free';

/**
 * Lifecycle state of an owner. A `BillingSubscription` row is authoritative
 * once present; owners without one fall back to `User.plan` (legacy manual
 * plans + onboarding trials).
 */
export function classifyOwnerPlan(
  owner: RevenueOwner,
  sub: Pick<RevenueSubscription, 'plan' | 'status'> | null | undefined,
  now: Date,
): OwnerPlanState {
  if (sub) {
    if (isPaidSubscription(sub)) return 'paid';
  } else if (PAID_PLAN_BUCKETS.includes((owner.plan || '').toLowerCase())) {
    return 'paid';
  }
  const plan = (owner.plan || 'trial').toLowerCase();
  if (plan === 'trial') {
    return owner.trialEndsAt && owner.trialEndsAt <= now ? 'trial_expired' : 'trial';
  }
  return 'free';
}

export interface PlanDistributionBucket {
  key: string;
  label: string;
  color: string;
  count: number;
}

const TIER_COLORS = ['#0A0A0A', '#404040', '#737373', '#A3A3A3', '#D4D4D4'];

/**
 * Plan distribution across owners — one bucket per live tier (sortOrder),
 * then "Diğer ücretli" (paid without a tier link), "Deneme", "Deneme süresi
 * bitti" and "Ücretsiz". Tiers render even when empty (`includeEmptyTiers`)
 * so the catalog is visible; the rest only when non-zero.
 */
export function buildPlanDistribution({
  owners,
  subscriptions,
  tiers,
  now,
  includeEmptyTiers = true,
}: {
  owners: RevenueOwner[];
  subscriptions: RevenueSubscription[];
  tiers: AdminPlanRow[];
  now: Date;
  includeEmptyTiers?: boolean;
}): { buckets: PlanDistributionBucket[]; counts: Record<OwnerPlanState, number> } {
  const subsByUser = new Map(subscriptions.map((s) => [s.userId, s]));
  const tierCounts = new Map<string, number>();
  let otherPaid = 0;
  const counts: Record<OwnerPlanState, number> = { paid: 0, trial: 0, trial_expired: 0, free: 0 };
  for (const owner of owners) {
    const sub = subsByUser.get(owner.id);
    const state = classifyOwnerPlan(owner, sub, now);
    counts[state] += 1;
    if (state !== 'paid') continue;
    const tierId = sub?.subscriptionPlanId;
    if (tierId && tiers.some((t) => t.id === tierId)) {
      tierCounts.set(tierId, (tierCounts.get(tierId) ?? 0) + 1);
    } else {
      otherPaid += 1;
    }
  }
  const buckets: PlanDistributionBucket[] = [];
  tiers.forEach((tier, i) => {
    const count = tierCounts.get(tier.id) ?? 0;
    // Retired (inactive) tiers only appear while someone is still on them.
    const visible = count > 0 || (includeEmptyTiers && tier.isActive);
    if (!visible) return;
    buckets.push({
      key: `tier:${tier.id}`,
      label: tier.nameTr || tier.nameEn,
      color: TIER_COLORS[Math.min(i, TIER_COLORS.length - 1)],
      count,
    });
  });
  const extras: PlanDistributionBucket[] = [
    { key: 'other_paid', label: 'Diğer ücretli', color: '#525252', count: otherPaid },
    { key: 'trial', label: 'Deneme', color: '#C6F24E', count: counts.trial },
    { key: 'trial_expired', label: 'Deneme süresi bitti', color: '#D97706', count: counts.trial_expired },
    { key: 'free', label: 'Ücretsiz / süresi dolmuş', color: '#D4D4D4', count: counts.free },
  ];
  return { buckets: [...buckets, ...extras.filter((b) => b.count > 0)], counts };
}

/** "$1,234" / "$12.50" — admin money display (USD-only, §38.225). */
export function formatUsd(value: number): string {
  const whole = Math.abs(value - Math.round(value)) < 0.005;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(value);
}

/** Fetch every subscription row the revenue helpers need, plus all tiers. */
export async function loadRevenueInputs(): Promise<{
  subscriptions: RevenueSubscription[];
  tiers: AdminPlanRow[];
}> {
  const [subscriptions, tierRows] = await prisma.$transaction([
    prisma.billingSubscription.findMany({ select: REVENUE_SUBSCRIPTION_SELECT }),
    prisma.subscriptionPlan.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
  ]);
  return { subscriptions, tiers: tierRows.map(toAdminRow) };
}

// ─── MRR trend ────────────────────────────────────────────────────────

export interface MrrPoint {
  /** ISO YYYY-MM (e.g. 2026-04). */
  month: string;
  /** Total MRR for this month (USD major unit). */
  total: number;
  /**
   * Per-tier breakdown keyed by lower-cased tier name (`starter`, `growth`,
   * `scale`, …); paid subscriptions without a tier land under `other`.
   */
  byPlan: Record<string, number>;
}

/**
 * MRR trend by month — owner.createdAt <= endOfMonth, current subscription
 * price (subscription start/plan-switch history yok, today's subscription ≈
 * past subscription kabul edilir, CLAUDE.md §38.32 paterni).
 *
 * Returns N month points (oldest → newest); month string format YYYY-MM.
 */
export async function getMrrTrend(months: number, now: Date = new Date()): Promise<MrrPoint[]> {
  const [owners, subscriptions, tierRows] = await prisma.$transaction([
    prisma.user.findMany({
      where: { role: 'restaurant_owner' },
      select: { id: true, createdAt: true, isActive: true, deactivatedAt: true },
    }),
    prisma.billingSubscription.findMany({
      where: { status: 'active' },
      select: REVENUE_SUBSCRIPTION_SELECT,
    }),
    prisma.subscriptionPlan.findMany(),
  ]);
  const tiersById = new Map(tierRows.map((row) => [row.id, toAdminRow(row)]));
  const ownersById = new Map(owners.map((o) => [o.id, o]));

  // Pre-price each paying subscription once.
  const priced: Array<{ owner: (typeof owners)[number]; key: string; monthly: number }> = [];
  for (const sub of subscriptions) {
    if (!isPaidSubscription(sub)) continue;
    const owner = ownersById.get(sub.userId);
    if (!owner) continue;
    const tier = sub.subscriptionPlanId ? tiersById.get(sub.subscriptionPlanId) ?? null : null;
    const monthly = subscriptionMonthlyUsd(sub, tier);
    if (monthly == null) continue;
    const key = tier ? (tier.nameTr || tier.nameEn).toLowerCase() : 'other';
    priced.push({ owner, key, monthly });
  }

  const points: MrrPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    // End of month i months ago
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthLabel = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}`;

    const byPlan: Record<string, number> = {};
    let total = 0;
    for (const { owner, key, monthly } of priced) {
      // Owner exists at this month's snapshot? createdAt <= monthEnd.
      if (owner.createdAt > monthEnd) continue;
      // Was active during this month? Excludes those deactivated before month.
      if (!owner.isActive && owner.deactivatedAt && owner.deactivatedAt < monthEnd) continue;
      byPlan[key] = Math.round(((byPlan[key] || 0) + monthly) * 100) / 100;
      total += monthly;
    }

    points.push({ month: monthLabel, total: Math.round(total * 100) / 100, byPlan });
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
  /** Passives: rating === 4. */
  passives: number;
  /** Detractors: rating 1-3. */
  detractors: number;
  total: number;
  /** NPS = promoter% - detractor% (range -100..+100). 0 if total=0. */
  score: number;
  /** Window length in days (UI labels the window explicitly). */
  windowDays: number;
}

/**
 * NPS distribution across all workspace feedback in a window. Same bucket
 * definition + rounding as the analytics KPI (`calculateNPS`: 5★ promoter,
 * 4★ passive, 1-3★ detractor) so the two cards can never disagree for the
 * same window.
 */
export async function getNpsDistribution(sinceDays: number, now: Date = new Date()): Promise<NpsBucket> {
  const since = new Date(now.getTime() - sinceDays * 24 * 60 * 60 * 1000);
  const groups = await prisma.feedback.groupBy({
    by: ['rating'],
    where: { createdAt: { gte: since, lte: now } },
    _count: { _all: true },
  });
  const nps = calculateNPSFromCounts(
    groups.map((g) => ({ rating: g.rating, count: g._count._all })),
  );
  return {
    promoters: nps.promoters,
    passives: nps.passives,
    detractors: nps.detractors,
    total: nps.total,
    score: nps.npsScore,
    windowDays: sinceDays,
  };
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

// ─── CSV export (/api/admin/analytics/bi/export) ──────────────────────
//
// Pure — no DB. Section headers + columns follow the snapshot shape above
// (USD MRR keyed by tier name, NPS 5★ / 4★ / 1-3★). UTF-8 BOM for Excel TR.

/**
 * Tier columns for the MRR section — union of `byPlan` keys across every
 * month, first appearance wins, untiered (`other`) last. Mirrors
 * `mrrPlanKeys` in AdminBiSection (client component — cannot import this
 * prisma-backed module) so the CSV columns line up with the stacked chart
 * on /admin/analytics.
 */
export function biMrrPlanKeys(rows: MrrPoint[]): string[] {
  const keys: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row.byPlan)) {
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return [...keys.filter((k) => k !== 'other'), ...keys.filter((k) => k === 'other')];
}

export function biMrrPlanLabel(key: string): string {
  if (key === 'other') return 'Diğer';
  return key.charAt(0).toLocaleUpperCase('tr-TR') + key.slice(1);
}

export function buildBiCsv(snapshot: BiSnapshot): string {
  const lines: string[] = [];

  // Section 1: MRR trend (USD, per-tier columns from the snapshot keys)
  const planKeys = biMrrPlanKeys(snapshot.mrr);
  lines.push('# AYLIK TEKRARLAYAN GELİR (MRR, USD)');
  lines.push(['Ay', 'Toplam (USD)', ...planKeys.map(biMrrPlanLabel)].map(csvCell).join(','));
  for (const p of snapshot.mrr) {
    lines.push([
      p.month,
      p.total,
      ...planKeys.map((key) => p.byPlan[key] || 0),
    ].map(csvCell).join(','));
  }
  lines.push('');

  // Section 2: Churn
  lines.push('# KAYIP ORANI');
  lines.push(['Ay', 'Pasifleşen', 'Aktif (ay başı)', 'Oran %'].map(csvCell).join(','));
  for (const p of snapshot.churn) {
    lines.push([p.month, p.churned, p.active, p.ratePct].map(csvCell).join(','));
  }
  lines.push('');

  // Section 3: NPS (5★ destekçi, 4★ nötr, 1-3★ eleştiren — admin-bi.ts)
  const npsWindow = snapshot.nps.windowDays;
  lines.push(`# NPS DAĞILIMI (son ${npsWindow} gün)`);
  lines.push(
    ['Destekçi (5★)', 'Nötr (4★)', 'Eleştiren (1-3★)', 'Toplam', 'Skor', 'Pencere (gün)']
      .map(csvCell)
      .join(','),
  );
  lines.push([
    snapshot.nps.promoters,
    snapshot.nps.passives,
    snapshot.nps.detractors,
    snapshot.nps.total,
    snapshot.nps.score,
    npsWindow,
  ].map(csvCell).join(','));
  lines.push('');

  // Section 4: Cohort retention
  lines.push('# KOHORT ELDE TUTMA (kayıt ayı bazlı)');
  lines.push(['Kohort ayı', 'Kayıt', 'Aktif (ücretli)', 'Deneme', 'Elde tutma %'].map(csvCell).join(','));
  for (const p of snapshot.cohort) {
    lines.push([p.cohortMonth, p.signups, p.retainedActive, p.retainedTrial, p.retentionPct].map(csvCell).join(','));
  }
  lines.push('');

  // Footer
  lines.push(`# Oluşturma: ${snapshot.generatedAt}`);
  lines.push(`# Aralık: ${snapshot.range} (${snapshot.months} ay)`);

  return '\ufeff' + lines.join('\n');
}
