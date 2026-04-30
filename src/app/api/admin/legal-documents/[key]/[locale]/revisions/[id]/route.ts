import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { isSupportedLegalKey, isSupportedLegalLocale } from '@/lib/legal/keys';

export const dynamic = 'force-dynamic';

/**
 * Tek bir revision satırının full snapshot'ı (içerik dahil).
 * Liste GET sadece metadata döner; bu endpoint diff / preview için.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string; locale: string; id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { key, locale, id } = await params;
  if (!isSupportedLegalKey(key) || !isSupportedLegalLocale(locale))
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });

  const row = await prisma.legalDocumentRevision.findUnique({
    where: { id },
    select: {
      id: true,
      documentKey: true,
      locale: true,
      version: true,
      editType: true,
      title: true,
      content: true,
      isActive: true,
      effectiveAt: true,
      editedById: true,
      createdAt: true,
    },
  });
  if (!row) return ApiErrors.notFound();
  if (row.documentKey !== key || row.locale !== locale)
    return NextResponse.json({ error: 'mismatch' }, { status: 400 });

  return NextResponse.json({
    revision: {
      ...row,
      effectiveAt: row.effectiveAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    },
  });
}
