import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiErrors } from '@/lib/api-errors';
import { getAdminFromRequest } from '@/lib/auth';
import { toAdminRow } from '@/lib/subscription-plans';

export const dynamic = 'force-dynamic';

const ALLOWED_PERIODS = new Set(['month', 'year', 'one-time']);
const ALLOWED_DISCOUNT_TYPES = new Set(['percent', 'fixed']);

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  const errors: string[] = [];

  if (body.nameTr !== undefined) {
    const v = asString(body.nameTr, 80);
    if (!v) errors.push('TR ad boş olamaz.');
    else data.nameTr = v;
  }
  if (body.nameEn !== undefined) {
    const v = asString(body.nameEn, 80);
    if (!v) errors.push('EN ad boş olamaz.');
    else data.nameEn = v;
  }
  if (body.descriptionTr !== undefined) {
    const v = asString(body.descriptionTr, 500);
    if (!v) errors.push('TR açıklama boş olamaz.');
    else data.descriptionTr = v;
  }
  if (body.descriptionEn !== undefined) {
    const v = asString(body.descriptionEn, 500);
    if (!v) errors.push('EN açıklama boş olamaz.');
    else data.descriptionEn = v;
  }
  if (body.priceTry !== undefined) {
    const p = asInt(body.priceTry);
    if (p == null || p < 0) errors.push('TRY fiyatı geçersiz.');
    else data.priceTry = p;
  }
  if (body.priceUsd !== undefined) {
    const p = asInt(body.priceUsd);
    data.priceUsd = p != null && p >= 0 ? p : null;
  }
  // Yıllık fiyat override (CLAUDE.md §15.2). null/undefined ise public
  // sayfa formula fallback (aylık × 12 × 0.8) uygular.
  if (body.priceYearlyTry !== undefined) {
    const p = asInt(body.priceYearlyTry);
    data.priceYearlyTry = p != null && p >= 0 ? p : null;
  }
  if (body.priceYearlyUsd !== undefined) {
    const p = asInt(body.priceYearlyUsd);
    data.priceYearlyUsd = p != null && p >= 0 ? p : null;
  }
  if (body.period !== undefined) {
    const period = asString(body.period, 20);
    if (!ALLOWED_PERIODS.has(period)) errors.push('Geçersiz periyot.');
    else data.period = period;
  }
  if (body.featuresTr !== undefined) data.featuresTr = asStringArray(body.featuresTr);
  if (body.featuresEn !== undefined) data.featuresEn = asStringArray(body.featuresEn);
  if (body.buttonTextTr !== undefined) data.buttonTextTr = asString(body.buttonTextTr, 60) || 'Başla';
  if (body.buttonTextEn !== undefined) data.buttonTextEn = asString(body.buttonTextEn, 60) || 'Start';
  if (body.buttonHref !== undefined) data.buttonHref = asString(body.buttonHref, 200) || '/auth/register';
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  if (typeof body.isFeatured === 'boolean') data.isFeatured = body.isFeatured;
  if (body.sortOrder !== undefined) {
    const o = asInt(body.sortOrder);
    if (o != null) data.sortOrder = o;
  }
  if (typeof body.discountActive === 'boolean') data.discountActive = body.discountActive;
  if (body.discountType !== undefined) {
    const t = asString(body.discountType, 16);
    data.discountType = t && ALLOWED_DISCOUNT_TYPES.has(t) ? t : null;
  }
  if (body.discountValue !== undefined) {
    const v = asInt(body.discountValue);
    data.discountValue = v != null && v >= 0 ? v : null;
  }
  if (body.discountLabelTr !== undefined) {
    data.discountLabelTr = asString(body.discountLabelTr, 40) || null;
  }
  if (body.discountLabelEn !== undefined) {
    data.discountLabelEn = asString(body.discountLabelEn, 40) || null;
  }

  if (errors.length) return NextResponse.json({ error: errors.join(' ') }, { status: 400 });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (data.isFeatured === true) {
        await tx.subscriptionPlan.updateMany({
          where: { isFeatured: true, NOT: { id } },
          data: { isFeatured: false },
        });
      }
      return tx.subscriptionPlan.update({ where: { id }, data });
    });
    return NextResponse.json({ data: toAdminRow(updated) });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'P2025') return ApiErrors.notFound('Plan bulunamadı');
    console.error('[/api/admin/plans PATCH] failed:', error);
    return ApiErrors.internalError('Plan güncellenemedi');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { id } = await params;
  try {
    await prisma.subscriptionPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'P2025') return ApiErrors.notFound('Plan bulunamadı');
    console.error('[/api/admin/plans DELETE] failed:', error);
    return ApiErrors.internalError('Plan silinemedi');
  }
}
