/**
 * Pure builders behind getBiSnapshot (src/lib/admin-bi.ts). The snapshot
 * loads every input in one transaction and runs these; the exported
 * get* helpers run the same builders on their own reads. No DB.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildChurnTrend,
  buildCohortRetention,
  buildMrrTrend,
  buildNpsBucket,
  type RevenueSubscription,
} from '../src/lib/admin-bi';
import type { AdminPlanRow } from '../src/lib/subscription-plans';

function tier(id: string, name: string, priceUsd: number): AdminPlanRow {
  return {
    id,
    nameTr: name,
    nameEn: name,
    descriptionTr: '',
    descriptionEn: '',
    priceTry: 0,
    priceUsd,
    priceYearlyTry: null,
    priceYearlyUsd: null,
    period: 'month',
    featuresTr: [],
    featuresEn: [],
    buttonTextTr: '',
    buttonTextEn: '',
    buttonHref: '',
    isActive: true,
    isFeatured: false,
    sortOrder: 0,
    discountActive: false,
    discountType: null,
    discountValue: null,
    discountLabelTr: null,
    discountLabelEn: null,
    paymentProvider: 'paynkolay',
    moduleKeys: [],
    modulesManaged: false,
    maxBusinesses: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
}

function sub(userId: string, extra: Partial<RevenueSubscription> = {}): RevenueSubscription {
  return {
    userId,
    plan: 'monthly',
    status: 'active',
    amount: null,
    currency: 'USD',
    billingCycle: 'monthly',
    subscriptionPlanId: null,
    ...extra,
  };
}

const NOW = new Date(2026, 5, 15, 12, 0, 0); // 15 June 2026, local time

test('buildMrrTrend: prices paid subs by tier and respects owner signup month', () => {
  const owners = [
    { id: 'u1', createdAt: new Date(2026, 0, 10), isActive: true, deactivatedAt: null },
    { id: 'u2', createdAt: new Date(2026, 4, 20), isActive: true, deactivatedAt: null },
    { id: 'u3', createdAt: new Date(2026, 0, 10), isActive: true, deactivatedAt: null },
  ];
  const subscriptions = [
    sub('u1', { subscriptionPlanId: 'growth' }),
    sub('u2', { subscriptionPlanId: 'growth' }),
    // Trial bucket never counts as revenue.
    sub('u3', { plan: 'trial', subscriptionPlanId: 'growth' }),
    // Unknown owner is skipped.
    sub('ghost', { subscriptionPlanId: 'growth' }),
  ];
  const points = buildMrrTrend({
    owners,
    subscriptions,
    tiers: [tier('growth', 'Growth', 29)],
    months: 3,
    now: NOW,
  });
  assert.deepEqual(
    points.map((p) => p.month),
    ['2026-04', '2026-05', '2026-06'],
  );
  assert.equal(points[0].total, 29);
  assert.equal(points[1].total, 58);
  assert.deepEqual(points[2].byPlan, { growth: 58 });
});

test('buildChurnTrend: denominator is active at month start, churn within month', () => {
  const owners = [
    { createdAt: new Date(2026, 0, 1), deactivatedAt: null },
    { createdAt: new Date(2026, 0, 1), deactivatedAt: new Date(2026, 5, 3) },
    { createdAt: new Date(2026, 0, 1), deactivatedAt: new Date(2026, 1, 3) },
    { createdAt: new Date(2026, 5, 10), deactivatedAt: null },
  ];
  const points = buildChurnTrend(owners, 2, NOW);
  assert.deepEqual(points, [
    { month: '2026-05', churned: 0, active: 2, ratePct: 0 },
    { month: '2026-06', churned: 1, active: 2, ratePct: 50 },
  ]);
});

test('buildCohortRetention: active paid vs trial per signup month', () => {
  const owners = [
    { createdAt: new Date(2026, 5, 2), plan: 'monthly', isActive: true },
    { createdAt: new Date(2026, 5, 3), plan: 'trial', isActive: true },
    { createdAt: new Date(2026, 5, 4), plan: 'free', isActive: true },
    { createdAt: new Date(2026, 5, 5), plan: 'monthly', isActive: false },
    { createdAt: new Date(2026, 4, 5), plan: null, isActive: true },
  ];
  const points = buildCohortRetention(owners, 2, NOW);
  assert.deepEqual(points, [
    { cohortMonth: '2026-05', signups: 1, retainedActive: 0, retainedTrial: 1, retentionPct: 100 },
    { cohortMonth: '2026-06', signups: 4, retainedActive: 1, retainedTrial: 1, retentionPct: 50 },
  ]);
});

test('buildNpsBucket: 5★ promoters, 4★ passives, 1-3★ detractors', () => {
  const nps = buildNpsBucket(
    [
      { rating: 5, _count: { _all: 6 } },
      { rating: 4, _count: { _all: 2 } },
      { rating: 2, _count: { _all: 2 } },
    ],
    30,
  );
  assert.equal(nps.promoters, 6);
  assert.equal(nps.passives, 2);
  assert.equal(nps.detractors, 2);
  assert.equal(nps.total, 10);
  assert.equal(nps.score, 40);
  assert.equal(nps.windowDays, 30);
});
