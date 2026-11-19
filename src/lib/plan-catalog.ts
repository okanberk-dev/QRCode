import type { PlanModuleKey } from '@/lib/plan-modules-catalog';

/**
 * Recommended package lineup (CLAUDE.md §15.2 "Paket stratejisi"). Client-safe:
 * no Prisma. The seed route and the 2026-11 data migration use these values;
 * admins can still change everything in /admin/plans afterwards.
 *
 * Strategy in one line: the plans differ by how many businesses they cover
 * (enforced in src/lib/plan-limits.ts) and by which modules they switch on
 * (enforced in src/lib/plan-modules.ts). The core review loop (QR, review
 * links, private feedback, alerts, replies, analytics) is in every plan.
 *
 * Every bullet below must stay true for today's product; tier bullets only
 * name modules the plan really switches on. The business count is not a
 * bullet — the pricing card prints it from `maxBusinesses`.
 */
export interface CatalogPlan {
  key: 'starter' | 'growth' | 'scale';
  /** English names the migration and the seed use to find an existing row. */
  matchNames: readonly string[];
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
  priceTry: number;
  priceYearlyTry: number;
  priceUsd: number;
  priceYearlyUsd: number;
  maxBusinesses: number | null;
  moduleKeys: PlanModuleKey[];
  featuresTr: string[];
  featuresEn: string[];
  isFeatured: boolean;
  sortOrder: number;
}

const CORE_TR = [
  'Sınırsız QR kod ve ekip üyesi',
  '10 yorum platformuna yönlendirme',
  'Düşük puanda anında e-posta uyarısı',
  'Geri bildirim kutusu, e-postayla yanıt ve yanıt şablonları',
  'Analitik raporlar ve CSV dışa aktarma',
];
const CORE_EN = [
  'Unlimited QR codes and team members',
  'Links to 10 review platforms',
  'Instant e-mail alert for low ratings',
  'Feedback inbox, e-mail replies and reply templates',
  'Analytics reports and CSV export',
];

export const PLAN_CATALOG: readonly CatalogPlan[] = [
  {
    key: 'starter',
    matchNames: ['starter'],
    nameTr: 'Başlangıç',
    nameEn: 'Starter',
    descriptionTr: 'Tek işletmesi olan restoran, kafe ve oteller için.',
    descriptionEn: 'For a single restaurant, café or hotel.',
    priceTry: 499,
    priceYearlyTry: 4990,
    priceUsd: 15,
    priceYearlyUsd: 150,
    maxBusinesses: 1,
    moduleKeys: ['externalPlatforms'],
    featuresTr: CORE_TR,
    featuresEn: CORE_EN,
    isFeatured: false,
    sortOrder: 10,
  },
  {
    key: 'growth',
    matchNames: ['growth'],
    nameTr: 'Büyüme',
    nameEn: 'Growth',
    descriptionTr: 'Yapay zekâ taslakları, dijital menü ve anketlerle 3 işletmeye kadar.',
    descriptionEn: 'AI drafts, a digital menu and surveys for up to 3 businesses.',
    priceTry: 999,
    priceYearlyTry: 9990,
    priceUsd: 29,
    priceYearlyUsd: 290,
    maxBusinesses: 3,
    moduleKeys: ['externalPlatforms', 'pulseAi', 'aiAnalytics', 'menu', 'surveys'],
    featuresTr: [
      'Başlangıç planındaki her şey',
      'Pulse AI yanıt taslakları',
      'Yapay zekâyla yorum temaları ve haftalık içgörü',
      'Dijital QR menü (7 tema)',
      'Müşteri anketleri',
    ],
    featuresEn: [
      'Everything in Starter',
      'Pulse AI reply drafts',
      'AI review themes and a weekly insight',
      'Digital QR menu (7 themes)',
      'Customer surveys',
    ],
    isFeatured: true,
    sortOrder: 20,
  },
  {
    key: 'scale',
    matchNames: ['scale', 'pro'],
    nameTr: 'Zincir',
    nameEn: 'Scale',
    descriptionTr: 'Şube sayısı artan zincirler ve gruplar için, 10 işletmeye kadar.',
    descriptionEn: 'For growing chains and groups, up to 10 businesses.',
    priceTry: 2499,
    priceYearlyTry: 24990,
    priceUsd: 69,
    priceYearlyUsd: 690,
    maxBusinesses: 10,
    moduleKeys: ['externalPlatforms', 'pulseAi', 'aiAnalytics', 'menu', 'surveys', 'googleReviews'],
    featuresTr: [
      'Büyüme planındaki her şey',
      'Google yorumlarına panelden yanıt (Google erişim onayından sonra)',
      'Öncelikli destek',
    ],
    featuresEn: [
      'Everything in Growth',
      'Reply to Google reviews from the panel (after Google approves access)',
      'Priority support',
    ],
    isFeatured: false,
    sortOrder: 30,
  },
];

/** Row data for `prisma.subscriptionPlan.create/update` from a catalog entry. */
export function catalogPlanData(plan: CatalogPlan) {
  return {
    nameTr: plan.nameTr,
    nameEn: plan.nameEn,
    descriptionTr: plan.descriptionTr,
    descriptionEn: plan.descriptionEn,
    priceTry: plan.priceTry,
    priceYearlyTry: plan.priceYearlyTry,
    priceUsd: plan.priceUsd,
    priceYearlyUsd: plan.priceYearlyUsd,
    period: 'month',
    featuresTr: plan.featuresTr,
    featuresEn: plan.featuresEn,
    buttonTextTr: 'Ücretsiz deneyin',
    buttonTextEn: 'Start free trial',
    buttonHref: '/auth/register',
    isActive: true,
    isFeatured: plan.isFeatured,
    sortOrder: plan.sortOrder,
    discountActive: false,
    paymentProvider: 'paynkolay',
    moduleKeys: plan.moduleKeys,
    modulesManaged: true,
    maxBusinesses: plan.maxBusinesses,
  };
}

/** "1 işletme" / "3 işletmeye kadar" — printed on plan cards from `maxBusinesses`. */
export function businessCountLabel(max: number, locale: 'tr' | 'en'): string {
  if (locale === 'en') return max === 1 ? '1 business' : `Up to ${max} businesses`;
  return max === 1 ? '1 işletme' : `${max} işletmeye kadar`;
}
