import { prisma } from '@/lib/prisma';

/** Public-shaped subscription plan — locale projection applied. */
export interface PublicPlan {
  id: string;
  name: string;
  description: string;
  /** Aylık liste fiyatı (indirimsiz). */
  priceMonthly: number;
  /**
   * Aylık-eşdeğer fiyat YILLIK plan altında (gösterim için).
   * `Math.round(priceYearlyTotal / 12)` — rounding-clean değildir, sadece
   * "₺X/ay" kart başlığı için kullanılır. Toplam yıllık tutar gerektiğinde
   * her zaman `priceYearlyTotal` kullanın (çarpma rounding bug'ı önlemek için).
   */
  priceYearly: number;
  /**
   * Yıllık TOPLAM tutar (kanonik). `BillingSubscription.amount` hesaplaması
   * + marketing kartı altında "X TRY/yıl" satırı buradan beslenir. Admin
   * override (SubscriptionPlan.priceYearlyTry/Usd) → bu değer; yoksa formula
   * `discountedMonthly × 12 × 0.8` (≈%20 yıllık indirim).
   */
  priceYearlyTotal: number;
  period: string;
  features: string[];
  buttonText: string;
  buttonHref: string;
  isFeatured: boolean;
  sortOrder: number;
  discount: {
    active: boolean;
    type: 'percent' | 'fixed' | null;
    value: number | null;
    label: string;
    discountedMonthly: number;
  };
}

export interface AdminPlanRow {
  id: string;
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
  priceTry: number;
  priceUsd: number | null;
  /** Yıllık fiyat — admin elle override edilebilir (CLAUDE.md §15.2). Null
   *  ise public sayfa formula fallback uygular (aylık × 12 × 0.8). */
  priceYearlyTry: number | null;
  priceYearlyUsd: number | null;
  period: string;
  featuresTr: string[];
  featuresEn: string[];
  buttonTextTr: string;
  buttonTextEn: string;
  buttonHref: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  discountActive: boolean;
  discountType: 'percent' | 'fixed' | null;
  discountValue: number | null;
  discountLabelTr: string | null;
  discountLabelEn: string | null;
  /** Payment provider — 'manual' | 'dodo_payments' | 'iyzico' (CLAUDE.md §44). */
  paymentProvider: string;
  /** Dodo Payments product ID — admin /admin/plans editöründen set edilir.
   *  Null = tier henüz Dodo product'a bağlı değil (checkout button gizli). */
  dodoProductId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0);
}

function discountTypeOrNull(v: unknown): 'percent' | 'fixed' | null {
  return v === 'percent' || v === 'fixed' ? v : null;
}

function applyDiscount(
  base: number,
  active: boolean,
  type: 'percent' | 'fixed' | null,
  value: number | null,
): number {
  if (!active || !type || value == null || value <= 0 || base <= 0) return base;
  if (type === 'percent') {
    const pct = Math.min(100, Math.max(0, value));
    return Math.max(0, Math.round(base * (1 - pct / 100)));
  }
  return Math.max(0, base - value);
}

export function toAdminRow(row: {
  id: string;
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
  priceTry: number;
  priceUsd: number | null;
  priceYearlyTry?: number | null;
  priceYearlyUsd?: number | null;
  period: string;
  featuresTr: unknown;
  featuresEn: unknown;
  buttonTextTr: string;
  buttonTextEn: string;
  buttonHref: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  discountActive: boolean;
  discountType: string | null;
  discountValue: number | null;
  discountLabelTr: string | null;
  discountLabelEn: string | null;
  paymentProvider?: string;
  dodoProductId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AdminPlanRow {
  return {
    id: row.id,
    nameTr: row.nameTr,
    nameEn: row.nameEn,
    descriptionTr: row.descriptionTr,
    descriptionEn: row.descriptionEn,
    priceTry: row.priceTry,
    priceUsd: row.priceUsd,
    priceYearlyTry: row.priceYearlyTry ?? null,
    priceYearlyUsd: row.priceYearlyUsd ?? null,
    period: row.period,
    featuresTr: asStringArray(row.featuresTr),
    featuresEn: asStringArray(row.featuresEn),
    buttonTextTr: row.buttonTextTr,
    buttonTextEn: row.buttonTextEn,
    buttonHref: row.buttonHref,
    isActive: row.isActive,
    isFeatured: row.isFeatured,
    sortOrder: row.sortOrder,
    discountActive: row.discountActive,
    discountType: discountTypeOrNull(row.discountType),
    discountValue: row.discountValue,
    discountLabelTr: row.discountLabelTr,
    discountLabelEn: row.discountLabelEn,
    paymentProvider: row.paymentProvider ?? 'manual',
    dodoProductId: row.dodoProductId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicPlan(row: AdminPlanRow, locale: 'tr' | 'en'): PublicPlan {
  const isTr = locale === 'tr';
  const baseMonthly = isTr ? row.priceTry : (row.priceUsd ?? Math.round(row.priceTry / 30));
  const discountedMonthly = applyDiscount(
    baseMonthly,
    row.discountActive,
    row.discountType,
    row.discountValue,
  );
  // Yıllık fiyat öncelik (CLAUDE.md §15.2):
  //   1. Admin override (priceYearlyTry/Usd dolu, > 0) → DB değeri kanonik YILLIK TOPLAM
  //   2. Formula fallback → `discountedMonthly × 12 × 0.8` (≈%20 yıllık indirim)
  //
  // Rounding disiplini: `priceYearlyTotal` her zaman authoritative; aylık-eşdeğer
  // `priceYearly = round(total / 12)` SADECE kart başlığı gösterimi için
  // (`₺X/ay`). "TRY/yıl" satırı veya billing summary tutarı her zaman
  // `priceYearlyTotal`'dan beslenir — yoksa `Math.round(total / 12) × 12 ≠ total`
  // rounding error'ı marketing × 12 ≠ admin'in yazdığı değer bug'ına yol açar.
  const adminYearly = isTr ? row.priceYearlyTry : row.priceYearlyUsd;
  const priceYearlyTotal =
    adminYearly != null && adminYearly > 0
      ? adminYearly
      : Math.round(discountedMonthly * 12 * 0.8);
  const yearlyMonthly = Math.round(priceYearlyTotal / 12);

  return {
    id: row.id,
    name: isTr ? row.nameTr : row.nameEn,
    description: isTr ? row.descriptionTr : row.descriptionEn,
    priceMonthly: baseMonthly,
    priceYearly: yearlyMonthly,
    priceYearlyTotal,
    period: row.period,
    features: isTr ? row.featuresTr : row.featuresEn,
    buttonText: isTr ? row.buttonTextTr : row.buttonTextEn,
    buttonHref: row.buttonHref,
    isFeatured: row.isFeatured,
    sortOrder: row.sortOrder,
    discount: {
      active: row.discountActive,
      type: row.discountType,
      value: row.discountValue,
      label: (isTr ? row.discountLabelTr : row.discountLabelEn) || '',
      discountedMonthly,
    },
  };
}

/**
 * Canonical billing amount resolver — `BillingSubscription` ile marketing
 * pricing arasında **tek source of truth**.
 *
 * Mevcut paterndeki sorun: admin "Pro · Yıllık" demek için iki ayrı kavram
 * vardı (plan="yearly" ile tier'ı kaybetmek vs amount'u el ile yazmak).
 * Yeni model: `subscriptionPlanId` tier'ı taşır, `billingCycle` cycle'ı
 * taşır, amount otomatik resolve edilir; admin "amount" alanı sadece manuel
 * override için (örn. promosyon, sezonluk).
 *
 * @param plan - SubscriptionPlan satırı (admin row formatında); `null` ise
 *   legacy/trial owner → null sonuç (UI fallback PLAN_LABELS davranışına döner)
 * @param billingCycle - 'monthly' | 'yearly' | null; null ise plan.period
 *   tahmin edilir (legacy davranış)
 * @param currency - 'TRY' | 'USD' (varsayılan TRY); USD null gelirse TRY'ye düşer
 * @returns canonical amount + meta (label, formula vs override flag)
 */
export function resolveBillingAmount(
  plan: AdminPlanRow | null,
  billingCycle: 'monthly' | 'yearly' | null | undefined,
  currency: 'TRY' | 'USD' = 'TRY',
): {
  amount: number | null;
  amountYearlyTotal: number | null;
  amountMonthly: number | null;
  source: 'override' | 'formula' | 'none';
  tierName: string | null;
  cycle: 'monthly' | 'yearly' | null;
} {
  if (!plan) {
    return {
      amount: null,
      amountYearlyTotal: null,
      amountMonthly: null,
      source: 'none',
      tierName: null,
      cycle: billingCycle ?? null,
    };
  }
  const cycle: 'monthly' | 'yearly' =
    billingCycle === 'yearly' || billingCycle === 'monthly'
      ? billingCycle
      : plan.period === 'year'
        ? 'yearly'
        : 'monthly';
  const baseMonthly =
    currency === 'USD'
      ? (plan.priceUsd ?? Math.round(plan.priceTry / 30))
      : plan.priceTry;
  const discountedMonthly = applyDiscount(
    baseMonthly,
    plan.discountActive,
    plan.discountType,
    plan.discountValue,
  );
  const adminYearly = currency === 'USD' ? plan.priceYearlyUsd : plan.priceYearlyTry;
  const yearlyTotal =
    adminYearly != null && adminYearly > 0
      ? adminYearly
      : Math.round(discountedMonthly * 12 * 0.8);
  const yearlyMonthly = Math.round(yearlyTotal / 12);
  const source: 'override' | 'formula' =
    adminYearly != null && adminYearly > 0 ? 'override' : 'formula';
  // Aylık döngüsünde owner faturası ayda `discountedMonthly` kadar; yıllık
  // döngüsünde yıllık toplam `yearlyTotal` kadar (12 ayda bir tahsil edilir).
  const amount = cycle === 'yearly' ? yearlyTotal : discountedMonthly;
  return {
    amount,
    amountYearlyTotal: yearlyTotal,
    amountMonthly: cycle === 'yearly' ? yearlyMonthly : discountedMonthly,
    source,
    tierName: plan.nameTr || plan.nameEn || null,
    cycle,
  };
}

/**
 * Aktif paketlerin **admin-row** formatında listesi (canonical billing
 * resolver için). `getAllPlansForAdmin` zaten her şeyi döner ama
 * `MemberBillingModal` ve `/api/admin/members/[id]/billing` yalnızca aktif
 * tier'ları seçilebilir görmek ister.
 */
export async function getActivePlansAsAdmin(): Promise<AdminPlanRow[]> {
  const rows = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map(toAdminRow);
}

export async function getActivePlans(locale: 'tr' | 'en'): Promise<PublicPlan[]> {
  const rows = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map((r) => toPublicPlan(toAdminRow(r), locale));
}

export async function getAllPlansForAdmin(): Promise<AdminPlanRow[]> {
  const rows = await prisma.subscriptionPlan.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map(toAdminRow);
}
