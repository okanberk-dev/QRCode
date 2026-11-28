/**
 * Admin revenue helpers (src/lib/admin-bi.ts) — canonical billing (§15.2).
 * Pure logic only: MRR from BillingSubscription + SubscriptionPlan tiers,
 * owner lifecycle classification and plan distribution buckets. No DB.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBiCsv,
  buildPlanDistribution,
  classifyOwnerPlan,
  formatUsd,
  subscriptionMonthlyUsd,
  summarizeRevenue,
  type RevenueSubscription,
} from '../src/lib/admin-bi';
import type { AdminPlanRow } from '../src/lib/subscription-plans';
import { calculateNPS, calculateNPSFromCounts } from '../src/lib/analytics-nps';
import { buildActivationFunnel } from '../src/lib/activation-funnel';

function tier(id: string, name: string, priceUsd: number, extra: Partial<AdminPlanRow> = {}): AdminPlanRow {
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
    ...extra,
  };
}

function sub(userId: string, extra: Partial<RevenueSubscription> = {}): RevenueSubscription {
  return {
    userId,
    plan: 'monthly',
    status: 'active',
    amount: null,
    currency: 'USD',
    billingCycle: null,
    subscriptionPlanId: null,
    ...extra,
  };
}

const starter = tier('t-starter', 'Starter', 1);
const growth = tier('t-growth', 'Growth', 40);
const scale = tier('t-scale', 'Scale', 100, { priceYearlyUsd: 960 });
const tiersById = new Map([starter, growth, scale].map((t) => [t.id, t]));

test('subscriptionMonthlyUsd: tier price drives MRR (card payment writes plan="monthly")', () => {
  assert.equal(subscriptionMonthlyUsd(sub('u1', { subscriptionPlanId: 't-growth' }), growth), 40);
});

test('subscriptionMonthlyUsd: yearly cycle uses the yearly total / 12', () => {
  assert.equal(
    subscriptionMonthlyUsd(sub('u1', { subscriptionPlanId: 't-scale', billingCycle: 'yearly' }), scale),
    80,
  );
});

test('subscriptionMonthlyUsd: USD admin override wins; yearly override is divided by 12', () => {
  assert.equal(subscriptionMonthlyUsd(sub('u1', { amount: 25, subscriptionPlanId: 't-growth' }), growth), 25);
  assert.equal(subscriptionMonthlyUsd(sub('u1', { amount: 120, billingCycle: 'yearly' }), null), 10);
});

test('subscriptionMonthlyUsd: non-USD override falls back to the tier, or unpriced', () => {
  assert.equal(subscriptionMonthlyUsd(sub('u1', { amount: 999, currency: 'TRY', subscriptionPlanId: 't-growth' }), growth), 40);
  assert.equal(subscriptionMonthlyUsd(sub('u1', { amount: 999, currency: 'TRY' }), null), null);
});

test('summarizeRevenue: MRR only counts active paid subscriptions; usage counts tier holders', () => {
  const summary = summarizeRevenue(
    [
      sub('a', { subscriptionPlanId: 't-growth' }),
      sub('b', { subscriptionPlanId: 't-scale' }),
      sub('c', { subscriptionPlanId: 't-growth', status: 'past_due' }),
      sub('d', { subscriptionPlanId: 't-growth', status: 'canceled', plan: 'free' }),
      sub('e', { plan: 'trial' }),
      sub('f', { amount: 50, currency: 'TRY' }),
    ],
    tiersById,
  );
  assert.equal(summary.mrrUsd, 140);
  assert.equal(summary.activeSubscriptions, 3);
  assert.equal(summary.unpricedSubscriptions, 1);
  assert.deepEqual(summary.usageByPlanId, { 't-growth': 2, 't-scale': 1 });
});

test('classifyOwnerPlan: subscription row is authoritative, User.plan is the fallback', () => {
  const now = new Date('2026-10-11T12:00:00Z');
  const future = new Date('2026-10-20T00:00:00Z');
  const past = new Date('2026-10-01T00:00:00Z');
  assert.equal(classifyOwnerPlan({ id: '1', plan: 'monthly', trialEndsAt: null }, sub('1'), now), 'paid');
  // Lapsed card subscriber: expiry sets plan "free" on both rows.
  assert.equal(
    classifyOwnerPlan({ id: '2', plan: 'free', trialEndsAt: null }, sub('2', { plan: 'free', status: 'canceled' }), now),
    'free',
  );
  // Legacy manual paid plan without a subscription row.
  assert.equal(classifyOwnerPlan({ id: '3', plan: 'yearly', trialEndsAt: null }, null, now), 'paid');
  assert.equal(classifyOwnerPlan({ id: '4', plan: 'trial', trialEndsAt: future }, null, now), 'trial');
  assert.equal(classifyOwnerPlan({ id: '5', plan: 'trial', trialEndsAt: past }, null, now), 'trial_expired');
  assert.equal(classifyOwnerPlan({ id: '6', plan: 'free', trialEndsAt: null }, null, now), 'free');
});

test('buildPlanDistribution: tier buckets + lifecycle buckets, never "free" counted as trial', () => {
  const now = new Date('2026-10-11T12:00:00Z');
  const { buckets, counts } = buildPlanDistribution({
    owners: [
      { id: 'a', plan: 'monthly', trialEndsAt: null },
      { id: 'b', plan: 'monthly', trialEndsAt: null },
      { id: 'c', plan: 'enterprise', trialEndsAt: null },
      { id: 'd', plan: 'trial', trialEndsAt: new Date('2026-10-20') },
      { id: 'e', plan: 'free', trialEndsAt: null },
    ],
    subscriptions: [
      sub('a', { subscriptionPlanId: 't-growth' }),
      sub('b', { subscriptionPlanId: 't-scale' }),
    ],
    tiers: [starter, growth, scale],
    now,
  });
  assert.deepEqual(counts, { paid: 3, trial: 1, trial_expired: 0, free: 1 });
  const byLabel = Object.fromEntries(buckets.map((b) => [b.label, b.count]));
  assert.deepEqual(byLabel, {
    Starter: 0,
    Growth: 1,
    Scale: 1,
    'Diğer ücretli': 1,
    Deneme: 1,
    'Ücretsiz / süresi dolmuş': 1,
  });
});

test('formatUsd: whole dollars without decimals, cents with two', () => {
  assert.equal(formatUsd(0), '$0');
  assert.equal(formatUsd(1234), '$1,234');
  assert.equal(formatUsd(12.5), '$12.50');
});

test('calculateNPSFromCounts matches calculateNPS (single NPS definition)', () => {
  const ratings = [5, 5, 5, 4, 4, 3, 3, 2, 1, 1];
  const fromRows = calculateNPS(ratings.map((rating) => ({ rating })));
  const fromCounts = calculateNPSFromCounts([
    { rating: 5, count: 3 },
    { rating: 4, count: 2 },
    { rating: 3, count: 2 },
    { rating: 2, count: 1 },
    { rating: 1, count: 2 },
  ]);
  assert.deepEqual(fromCounts, fromRows);
  // 3★ is a detractor: (30% - 50%) = -20
  assert.equal(fromCounts.npsScore, -20);
});

test('buildBiCsv: USD header, per-tier columns from snapshot keys (untiered last), NPS 5/4/1-3★ + window', () => {
  const csv = buildBiCsv({
    range: '90d',
    months: 2,
    mrr: [
      { month: '2026-09', total: 40, byPlan: { other: 10, growth: 30 } },
      { month: '2026-10', total: 141, byPlan: { growth: 40, scale: 100, other: 1 } },
    ],
    churn: [{ month: '2026-10', churned: 1, active: 10, ratePct: 10 }],
    nps: { promoters: 3, passives: 2, detractors: 5, total: 10, score: -20, windowDays: 90 },
    cohort: [{ cohortMonth: '2026-10', signups: 4, retainedActive: 1, retainedTrial: 2, retentionPct: 75 }],
    funnel: buildActivationFunnel({
      windowDays: 90,
      ownerIds: ['u1', 'u2'],
      restaurants: [{ id: 'r1', userId: 'u1' }],
      qrRestaurantIds: ['r1'],
      feedbackRestaurantIds: [],
    }),
    generatedAt: '2026-10-11T00:00:00.000Z',
  });
  assert.ok(csv.startsWith('\ufeff'), 'UTF-8 BOM for Excel');
  const lines = csv.slice(1).split('\n');
  assert.equal(lines[1], '"Ay","Toplam (USD)","Growth","Scale","Diğer"');
  assert.equal(lines[2], '"2026-09","40","30","0","10"');
  assert.equal(lines[3], '"2026-10","141","40","100","1"');
  assert.ok(!csv.includes('TRY'), 'no TRY header over USD values');
  assert.ok(lines.includes('"Memnun (5★)","Orta (4★)","Memnun değil (1–3★)","Toplam","Memnuniyet farkı","Pencere (gün)"'));
  assert.ok(lines.includes('"3","2","5","10","-20","90"'));
  assert.ok(lines.includes('# KURULUM ADIMLARI (son 90 günde kaydolan işletme sahipleri)'));
  assert.ok(lines.includes('"Kayıt oldu","2","100"'));
  assert.ok(lines.includes('"QR oluşturdu","1","50"'));
  assert.ok(lines.includes('"İlk müşteri puanını aldı","0","0"'));
});

test('buildBiCsv: no paid subscriptions → only month + total columns', () => {
  const csv = buildBiCsv({
    range: '30d',
    months: 1,
    mrr: [{ month: '2026-10', total: 0, byPlan: {} }],
    churn: [],
    nps: { promoters: 0, passives: 0, detractors: 0, total: 0, score: 0, windowDays: 30 },
    cohort: [],
    funnel: buildActivationFunnel({
      windowDays: 30,
      ownerIds: [],
      restaurants: [],
      qrRestaurantIds: [],
      feedbackRestaurantIds: [],
    }),
    generatedAt: '2026-10-11T00:00:00.000Z',
  });
  const lines = csv.slice(1).split('\n');
  assert.equal(lines[1], '"Ay","Toplam (USD)"');
  assert.equal(lines[2], '"2026-10","0"');
});
