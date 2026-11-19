import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiErrors } from '@/lib/api-errors';
import { getAdminFromRequest } from '@/lib/auth';
import { revalidatePricing } from '@/lib/marketing-revalidate';
import { normalizeModuleKeys } from '@/lib/plan-modules-catalog';
import { getAllPlansForAdmin, toAdminRow } from '@/lib/subscription-plans';

export const dynamic = 'force-dynamic';

const ALLOWED_PERIODS = new Set(['month', 'year', 'one-time']);
const ALLOWED_DISCOUNT_TYPES = new Set(['percent', 'fixed']);
// CLAUDE.md §44 — 'paynkolay' = owner pays by card (TRY price required).
const ALLOWED_PAYMENT_PROVIDERS = new Set(['manual', 'paynkolay']);

function asString(v: unknown, max = 1000): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}
function asInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) {
    return Math.trunc(Number(v));
  }
  return null;
}
function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter((s) => s.length > 0)
    .slice(0, 30);
}

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  try {
    const plans = await getAllPlansForAdmin();
    return NextResponse.json({ data: plans });
  } catch (error) {
    console.error('[/api/admin/plans GET] failed:', error);
    return ApiErrors.internalError('Planlar listelenemedi');
  }
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const body = await req.json().catch(() => ({}));
  const errors: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};

  const nameTr = asString(body.nameTr, 80);
  const nameEn = asString(body.nameEn, 80);
  const descTr = asString(body.descriptionTr, 500);
  const descEn = asString(body.descriptionEn, 500);
  if (!nameTr) errors.push('TR ad zorunlu.');
  if (!nameEn) errors.push('EN ad zorunlu.');
  if (!descTr) errors.push('TR açıklama zorunlu.');
  if (!descEn) errors.push('EN açıklama zorunlu.');
  data.nameTr = nameTr;
  data.nameEn = nameEn;
  data.descriptionTr = descTr;
  data.descriptionEn = descEn;

  const priceTry = asInt(body.priceTry);
  if (priceTry == null || priceTry < 0) errors.push('TRY fiyatı geçersiz.');
  else data.priceTry = priceTry;
  const priceUsd = asInt(body.priceUsd);
  data.priceUsd = priceUsd != null && priceUsd >= 0 ? priceUsd : null;

  // Yıllık fiyat (admin override) — null/undefined ise public sayfa formula
  // fallback (aylık × 12 × 0.8) uygular. Pozitif int ya da null kabul eder.
  const priceYearlyTry = asInt(body.priceYearlyTry);
  data.priceYearlyTry = priceYearlyTry != null && priceYearlyTry >= 0 ? priceYearlyTry : null;
  const priceYearlyUsd = asInt(body.priceYearlyUsd);
  data.priceYearlyUsd = priceYearlyUsd != null && priceYearlyUsd >= 0 ? priceYearlyUsd : null;

  const period = asString(body.period, 20) || 'month';
  if (!ALLOWED_PERIODS.has(period)) errors.push('Geçersiz periyot.');
  else data.period = period;

  data.featuresTr = asStringArray(body.featuresTr);
  data.featuresEn = asStringArray(body.featuresEn);
  data.buttonTextTr = asString(body.buttonTextTr, 60) || 'Başla';
  data.buttonTextEn = asString(body.buttonTextEn, 60) || 'Start';
  data.buttonHref = asString(body.buttonHref, 200) || '/auth/register';
  data.isActive = typeof body.isActive === 'boolean' ? body.isActive : true;
  data.isFeatured = typeof body.isFeatured === 'boolean' ? body.isFeatured : false;
  const sortOrder = asInt(body.sortOrder);
  data.sortOrder = sortOrder != null ? sortOrder : 0;

  data.discountActive = typeof body.discountActive === 'boolean' ? body.discountActive : false;
  const dType = asString(body.discountType, 16);
  data.discountType = dType && ALLOWED_DISCOUNT_TYPES.has(dType) ? dType : null;
  const dValue = asInt(body.discountValue);
  data.discountValue = dValue != null && dValue >= 0 ? dValue : null;
  data.discountLabelTr = asString(body.discountLabelTr, 40) || null;
  data.discountLabelEn = asString(body.discountLabelEn, 40) || null;

  // Payment provider routing (CLAUDE.md §44, Stage 140 §38.220)
  const provider = asString(body.paymentProvider, 20) || 'manual';
  if (!ALLOWED_PAYMENT_PROVIDERS.has(provider)) errors.push('Geçersiz ödeme sağlayıcı.');
  else data.paymentProvider = provider;
  data.moduleKeys = normalizeModuleKeys(body.moduleKeys);
  data.modulesManaged = body.modulesManaged === true;
  if (data.paymentProvider === 'paynkolay' && !(Number(data.priceTry) > 0)) {
    errors.push('PayNKolay için aylık TL fiyatı zorunlu.');
  }

  if (errors.length) return NextResponse.json({ error: errors.join(' ') }, { status: 400 });

  try {
    const created = await prisma.$transaction(async (tx) => {
      if (data.isFeatured === true) {
        await tx.subscriptionPlan.updateMany({
          where: { isFeatured: true },
          data: { isFeatured: false },
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return tx.subscriptionPlan.create({ data: data as any });
    });
    revalidatePricing();
    return NextResponse.json(
      { data: toAdminRow(created), revalidated: true },
      { status: 201, headers: { 'Cache-Control': 'no-store, must-revalidate' } },
    );
  } catch (error) {
    console.error('[/api/admin/plans POST] failed:', error);
    return ApiErrors.internalError('Plan oluşturulamadı');
  }
}
