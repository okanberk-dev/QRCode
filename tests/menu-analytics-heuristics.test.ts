import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYTICS_THRESHOLDS,
  buildUpsellInsights,
  classifyCategory,
  detectLowInterestProducts,
  type CategoryStat,
  type ProductStat,
} from '../src/lib/analytics-heuristics';

test('classifyCategory: Turkish capital letters are folded (İ / I / dotless ı)', () => {
  // "İçecekler" is the canonical Turkish name — a plain toLowerCase() turned it
  // into "i" + U+0307 + "çecekler" (a combining dot) and it was filed under "main".
  assert.equal(classifyCategory('İçecekler'), 'beverage');
  assert.equal(classifyCategory('Soğuk İçecekler'), 'beverage');
  assert.equal(classifyCategory('İÇECEKLER'), 'beverage');
  assert.equal(classifyCategory('Içecekler'), 'beverage');
  assert.equal(classifyCategory('icecekler'), 'beverage');
  assert.equal(classifyCategory('BAŞLANGIÇLAR'), 'starter');
  assert.equal(classifyCategory('Başlangıçlar'), 'starter');
  assert.equal(classifyCategory('TATLILAR'), 'dessert');
  assert.equal(classifyCategory('Tatlılar'), 'dessert');
  assert.equal(classifyCategory('ÇAY & KAHVE'), 'beverage');
});

test('classifyCategory: English names and the default bucket', () => {
  assert.equal(classifyCategory('Drinks'), 'beverage');
  assert.equal(classifyCategory('Desserts'), 'dessert');
  assert.equal(classifyCategory('Starters'), 'starter');
  assert.equal(classifyCategory('Burgerler'), 'main');
  assert.equal(classifyCategory('  Ana Yemekler  '), 'main');
  assert.equal(classifyCategory(''), 'main');
});

test('detectLowInterestProducts: thresholds and status labels', () => {
  const stats: ProductStat[] = [
    { productId: 'a', productName: 'A', categoryId: 'c', categoryName: 'C', views: 20, clicks: 0 },
    { productId: 'b', productName: 'B', categoryId: 'c', categoryName: 'C', views: 100, clicks: 3 },
    { productId: 'c', productName: 'C', categoryId: 'c', categoryName: 'C', views: 100, clicks: 7 },
    { productId: 'd', productName: 'D', categoryId: 'c', categoryName: 'C', views: 100, clicks: 9 },
    { productId: 'e', productName: 'E', categoryId: 'c', categoryName: 'C', views: 14, clicks: 0 },
  ];
  const out = detectLowInterestProducts(stats);
  const byId = Object.fromEntries(out.map((r) => [r.productId, r.status]));
  assert.equal(byId.a, 'needs_review'); // never tapped
  assert.equal(byId.b, 'check_description'); // < 4 %
  assert.equal(byId.c, 'low_interest'); // 4–8 %
  assert.equal(byId.d, undefined); // above 8 %
  assert.equal(byId.e, undefined); // not enough exposure
  // Worst interest first.
  assert.deepEqual(out.map((r) => r.productId), ['a', 'b', 'c']);
});

const mains: CategoryStat = { categoryId: 'm', categoryName: 'Burgerler', kind: 'main', views: 200, clicks: 40, productClicks: 30 };
const drinks: CategoryStat = { categoryId: 'd', categoryName: 'İçecekler', kind: 'beverage', views: 20, clicks: 2, productClicks: 1 };
const desserts: CategoryStat = { categoryId: 's', categoryName: 'Tatlılar', kind: 'dessert', views: 10, clicks: 1, productClicks: 0 };

test('buildUpsellInsights: weak drinks / desserts fire below the gap ratio', () => {
  const tr = buildUpsellInsights({ topProducts: [], categoryStats: [mains, drinks, desserts], locale: 'tr' });
  const kinds = tr.map((i) => i.kind);
  assert.ok(kinds.includes('weak_beverage_engagement'));
  assert.ok(kinds.includes('weak_dessert_engagement'));
  const bev = tr.find((i) => i.kind === 'weak_beverage_engagement')!;
  assert.deepEqual(bev.relatedIds, ['d']);
  assert.equal(bev.title, 'İçecekler az görülüyor');

  const en = buildUpsellInsights({ topProducts: [], categoryStats: [mains, drinks], locale: 'en' });
  assert.equal(en.find((i) => i.kind === 'weak_beverage_engagement')!.title, 'Drinks are rarely seen');
});

test('buildUpsellInsights: no insight when drinks keep up with the mains', () => {
  const healthy: CategoryStat = { ...drinks, views: 150 };
  const out = buildUpsellInsights({ topProducts: [], categoryStats: [mains, healthy], locale: 'tr' });
  assert.equal(out.length, 0);
});

test('buildUpsellInsights: low-interest product links to its id', () => {
  const top: ProductStat[] = [
    { productId: 'p1', productName: 'Klasik Burger', categoryId: 'm', categoryName: 'Burgerler', views: ANALYTICS_THRESHOLDS.upsellTopProductMinViews + 10, clicks: 1 },
  ];
  const out = buildUpsellInsights({ topProducts: top, categoryStats: [mains], locale: 'tr' });
  const row = out.find((i) => i.kind === 'low_ctr_product')!;
  assert.deepEqual(row.relatedIds, ['p1']);
  assert.match(row.title, /Klasik Burger/);
});

test('buildUpsellInsights: owner wording has no marketing jargon', () => {
  const top: ProductStat[] = [
    { productId: 'p1', productName: 'Klasik Burger', categoryId: 'm', categoryName: 'Burgerler', views: 80, clicks: 2 },
  ];
  const all = [
    ...buildUpsellInsights({ topProducts: top, categoryStats: [mains, drinks, desserts], locale: 'tr' }),
    ...buildUpsellInsights({ topProducts: top, categoryStats: [mains, drinks, desserts], locale: 'en' }),
  ];
  assert.ok(all.length >= 4);
  const banned = /dönüşüm|kombo|sepet|upsell|conversion|basket|cross-sell/i;
  for (const insight of all) {
    assert.doesNotMatch(`${insight.title} ${insight.description}`, banned, insight.kind);
  }
});

test('buildUpsellInsights: at most six insights', () => {
  const top: ProductStat[] = Array.from({ length: 5 }, (_, i) => ({
    productId: `p${i}`, productName: `Ürün ${i}`, categoryId: 'm', categoryName: 'Burgerler', views: 80, clicks: 1,
  }));
  const out = buildUpsellInsights({ topProducts: top, categoryStats: [mains, drinks, desserts], locale: 'tr' });
  assert.ok(out.length <= 6);
});
