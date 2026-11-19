import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBusinessLimitReached } from '../src/lib/plan-limits';
import { PLAN_CATALOG, businessCountLabel } from '../src/lib/plan-catalog';
import { toPublicPlan, type AdminPlanRow } from '../src/lib/subscription-plans';

test('business limit: no cap when max is null or invalid', () => {
  assert.equal(isBusinessLimitReached(50, null), false);
  assert.equal(isBusinessLimitReached(50, undefined), false);
  assert.equal(isBusinessLimitReached(50, 0), false);
});

test('business limit: reached at the cap', () => {
  assert.equal(isBusinessLimitReached(0, 1), false);
  assert.equal(isBusinessLimitReached(1, 1), true);
  assert.equal(isBusinessLimitReached(2, 3), false);
  assert.equal(isBusinessLimitReached(3, 3), true);
});

test('catalog: tiers grow in price, businesses and modules', () => {
  for (let i = 1; i < PLAN_CATALOG.length; i++) {
    const prev = PLAN_CATALOG[i - 1];
    const cur = PLAN_CATALOG[i];
    assert.ok(cur.priceTry > prev.priceTry);
    assert.ok((cur.maxBusinesses ?? Infinity) > (prev.maxBusinesses ?? 0));
    for (const key of prev.moduleKeys) assert.ok(cur.moduleKeys.includes(key), `${cur.key} keeps ${key}`);
    // Yearly = 10 months.
    assert.equal(cur.priceYearlyTry, cur.priceTry * 10);
  }
  assert.equal(PLAN_CATALOG.filter((p) => p.isFeatured).length, 1);
});

test('businessCountLabel', () => {
  assert.equal(businessCountLabel(1, 'tr'), '1 işletme');
  assert.equal(businessCountLabel(3, 'tr'), '3 işletmeye kadar');
  assert.equal(businessCountLabel(10, 'en'), 'Up to 10 businesses');
});

function row(extra: Partial<AdminPlanRow> = {}): AdminPlanRow {
  return {
    id: 'p', nameTr: 'Büyüme', nameEn: 'Growth', descriptionTr: '', descriptionEn: '',
    priceTry: 999, priceUsd: 29, priceYearlyTry: 9990, priceYearlyUsd: 290, period: 'month',
    featuresTr: [], featuresEn: [], buttonTextTr: '', buttonTextEn: '', buttonHref: '/auth/register',
    isActive: true, isFeatured: true, sortOrder: 20, discountActive: false, discountType: null,
    discountValue: null, discountLabelTr: null, discountLabelEn: null, paymentProvider: 'paynkolay',
    moduleKeys: ['pulseAi'], modulesManaged: true, maxBusinesses: 3,
    createdAt: new Date(0), updatedAt: new Date(0), ...extra,
  } as AdminPlanRow;
}

test('public plan: TRY prices on the Turkish page only', () => {
  const tr = toPublicPlan(row(), 'tr');
  assert.deepEqual(tr.tryPrices, { monthly: 999, listMonthly: 999, yearlyTotal: 9990, yearlyMonthly: 833 });
  assert.equal(toPublicPlan(row(), 'en').tryPrices, null);
  assert.equal(tr.maxBusinesses, 3);
});

test('public plan: no checkout until PayNKolay is configured', () => {
  assert.equal(toPublicPlan(row(), 'tr', { checkoutEnabled: false }).checkout, null);
  assert.deepEqual(toPublicPlan(row(), 'tr').checkout, { monthlyTry: 999, yearlyTry: 9990 });
});
