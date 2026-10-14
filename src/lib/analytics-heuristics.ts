// Rule-based analytics heuristics. All thresholds centralized here
// (no magic numbers scattered across components).

export const ANALYTICS_EVENT_TYPES = [
  'menu_view',
  'menu_category_click',
  'menu_product_view',
  'menu_product_click',
  'menu_upsell_click',
] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];
export function isValidEventType(v: unknown): v is AnalyticsEventType {
  return typeof v === 'string' && (ANALYTICS_EVENT_TYPES as readonly string[]).includes(v);
}

export const ANALYTICS_SOURCE_TYPES = ['qr', 'direct', 'table', 'link', 'delivery'] as const;
export type AnalyticsSourceType = (typeof ANALYTICS_SOURCE_TYPES)[number];

export const ANALYTICS_THRESHOLDS = {
  // Low-interest product: enough exposure, weak click-through.
  lowInterestMinViews: 15,
  lowInterestMaxCtr: 0.08, // 8 %

  // Upsell opportunity: a standout main dish with weak support-category engagement.
  upsellTopProductMinViews: 30,
  upsellWeakCategoryCtrThreshold: 0.1, // 10 %
  upsellMinGapRatio: 0.35, // support cat views / main cat views < 35 %

  // Dedupe windows — prevent spammy refreshes from inflating counts.
  dedupeProductViewMs: 5 * 60 * 1000, // 5 min
  dedupeCategoryClickMs: 30 * 1000, // 30 sec
  dedupeProductClickMs: 60 * 1000, // 1 min
  dedupeMenuViewMs: 2 * 60 * 1000, // 2 min
};

// Category classification via name substring. Turkish + English.
// Used to detect "support" categories for upsell heuristics.
//
// Names are compared after folding Turkish letters to plain ASCII. JavaScript
// lower-cases "İ" to "i" + a combining dot and "I" to a plain "i", so a plain
// `toLowerCase()` never matched the most common Turkish category names
// ("İçecekler", "BAŞLANGIÇLAR") against the dotted/dotless keywords below.
function foldTr(value: string): string {
  return value
    .replace(/İ/g, 'i')
    .toLowerCase()
    .replace(/\u0307/g, '')
    .replace(/ı/g, 'i')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .trim();
}
const foldAll = (list: string[]) => [...new Set(list.map(foldTr))];

const BEVERAGE_KEYWORDS = foldAll(['içecek', 'icecek', 'beverage', 'drink', 'içki', 'cocktail', 'kokteyl', 'kahve', 'coffee', 'tea', 'çay']);
const DESSERT_KEYWORDS = foldAll(['tatlı', 'tatli', 'dessert', 'pasta', 'cake', 'cheesecake', 'dondurma', 'ice cream']);
const STARTER_KEYWORDS = foldAll(['başlangıç', 'baslangic', 'starter', 'appetizer', 'meze', 'aperatif']);

export type CategoryKind = 'beverage' | 'dessert' | 'starter' | 'main' | 'other';

export function classifyCategory(name: string): CategoryKind {
  const n = foldTr(name);
  if (BEVERAGE_KEYWORDS.some((k) => n.includes(k))) return 'beverage';
  if (DESSERT_KEYWORDS.some((k) => n.includes(k))) return 'dessert';
  if (STARTER_KEYWORDS.some((k) => n.includes(k))) return 'starter';
  return 'main'; // default: treat as main
}

// Low-interest detection.
export interface ProductStat {
  productId: string;
  productName: string;
  categoryId: string | null;
  categoryName: string | null;
  views: number;
  clicks: number;
}

export interface LowInterestEntry extends ProductStat {
  ctr: number;
  status: 'low_interest' | 'needs_review' | 'check_description';
}

export function detectLowInterestProducts(stats: ProductStat[]): LowInterestEntry[] {
  const results: LowInterestEntry[] = [];
  for (const s of stats) {
    if (s.views < ANALYTICS_THRESHOLDS.lowInterestMinViews) continue;
    const ctr = s.clicks / Math.max(1, s.views);
    if (ctr > ANALYTICS_THRESHOLDS.lowInterestMaxCtr) continue;
    let status: LowInterestEntry['status'] = 'low_interest';
    if (ctr === 0) status = 'needs_review';
    else if (ctr < ANALYTICS_THRESHOLDS.lowInterestMaxCtr / 2) status = 'check_description';
    results.push({ ...s, ctr, status });
  }
  return results.sort((a, b) => a.ctr - b.ctr || b.views - a.views).slice(0, 20);
}

// Upsell insights. Deterministic rules only.
export interface CategoryStat {
  categoryId: string;
  categoryName: string;
  kind: CategoryKind;
  views: number; // sum of product views in the category
  clicks: number; // category clicks
  productClicks: number; // sum of product clicks
}

export type UpsellInsightKind =
  | 'weak_beverage_engagement'
  | 'weak_dessert_engagement'
  | 'low_ctr_product'
  | 'top_product_pair_opportunity';

export interface UpsellInsight {
  kind: UpsellInsightKind;
  title: string;
  description: string;
  relatedIds?: string[];
}

export function buildUpsellInsights(params: {
  topProducts: ProductStat[];
  categoryStats: CategoryStat[];
  locale: 'tr' | 'en';
}): UpsellInsight[] {
  const { topProducts, categoryStats, locale } = params;
  const tr = locale === 'tr';
  const insights: UpsellInsight[] = [];

  const mains = categoryStats.filter((c) => c.kind === 'main');
  const mainsViews = mains.reduce((acc, c) => acc + c.views, 0);
  const beverages = categoryStats.filter((c) => c.kind === 'beverage');
  const desserts = categoryStats.filter((c) => c.kind === 'dessert');
  const bevViews = beverages.reduce((acc, c) => acc + c.views, 0);
  const desViews = desserts.reduce((acc, c) => acc + c.views, 0);

  // Wording rule: plain owner language, no marketing jargon ("dönüşüm",
  // "kombo", "upsell"), and no promises the data cannot back ("sepeti
  // büyütebilir"). The rules and thresholds above are unchanged.
  if (mainsViews > 0 && bevViews > 0 && bevViews / mainsViews < ANALYTICS_THRESHOLDS.upsellMinGapRatio) {
    insights.push({
      kind: 'weak_beverage_engagement',
      title: tr ? 'İçecekler az görülüyor' : 'Drinks are rarely seen',
      description: tr
        ? 'İçecek bölümü ana yemeklere göre çok daha az görüntüleniyor. İçecekleri menüde daha üste almayı dene.'
        : 'The drinks section is viewed far less than the mains. Try moving drinks higher up the menu.',
      relatedIds: beverages.map((c) => c.categoryId),
    });
  }

  if (mainsViews > 0 && desViews > 0 && desViews / mainsViews < ANALYTICS_THRESHOLDS.upsellMinGapRatio) {
    insights.push({
      kind: 'weak_dessert_engagement',
      title: tr ? 'Tatlılar az görülüyor' : 'Desserts are rarely seen',
      description: tr
        ? 'Tatlı bölümü ana yemeklere göre az görüntüleniyor. Daha iyi bir fotoğraf ya da açıklama eklemeyi dene.'
        : 'The dessert section is viewed less than the mains. Try adding a better photo or description.',
      relatedIds: desserts.map((c) => c.categoryId),
    });
  }

  for (const p of topProducts.slice(0, 5)) {
    if (p.views >= ANALYTICS_THRESHOLDS.upsellTopProductMinViews && p.clicks / Math.max(1, p.views) < ANALYTICS_THRESHOLDS.lowInterestMaxCtr) {
      insights.push({
        kind: 'low_ctr_product',
        title: tr ? `${p.productName}: çok görülüyor, az dokunuluyor` : `${p.productName}: seen often, tapped rarely`,
        description: tr
          ? `“${p.productName}” sık görüntüleniyor ama az kişi açıyor. Fotoğrafını ya da açıklamasını gözden geçir.`
          : `“${p.productName}” is viewed a lot but few people open it. Review its photo or description.`,
        relatedIds: [p.productId],
      });
    }
  }

  if (topProducts.length > 0 && beverages.length > 0 && bevViews / Math.max(1, mainsViews) < 0.6) {
    const leader = topProducts[0];
    if (leader.views >= ANALYTICS_THRESHOLDS.upsellTopProductMinViews) {
      insights.push({
        kind: 'top_product_pair_opportunity',
        title: tr ? `${leader.productName} için içecek önerisi` : `A drink to go with ${leader.productName}`,
        description: tr
          ? `“${leader.productName}” çok ilgi görüyor. Yakınına bir içecek eklemeyi ya da ikisini birlikte önermeyi düşünebilirsin.`
          : `“${leader.productName}” gets a lot of attention. Consider placing a drink next to it, or suggesting the two together.`,
        relatedIds: [leader.productId, ...beverages.map((c) => c.categoryId)],
      });
    }
  }

  return insights.slice(0, 6);
}

// Percentage formatting helper.
export function formatPct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(digits)} %`;
}
