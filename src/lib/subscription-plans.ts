import { prisma } from '@/lib/prisma';

/** Public-shaped subscription plan — locale projection applied. */
export interface PublicPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number; // monthly * 0.80 (built-in 20% annual)
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
  const yearlyMonthly = Math.round(discountedMonthly * 0.8);

  return {
    id: row.id,
    name: isTr ? row.nameTr : row.nameEn,
    description: isTr ? row.descriptionTr : row.descriptionEn,
    priceMonthly: baseMonthly,
    priceYearly: yearlyMonthly,
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
