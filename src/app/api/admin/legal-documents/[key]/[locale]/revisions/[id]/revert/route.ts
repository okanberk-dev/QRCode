import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { isSupportedLegalKey, isSupportedLegalLocale } from '@/lib/legal/keys';
import { invalidateLegalDocumentCache } from '@/lib/legal/loader';
import { revalidateLegalDocument } from '@/lib/marketing-revalidate';

export const dynamic = 'force-dynamic';

/**
 * Eski revision'a geri dön → upsert + 'reverted' revision tek transaction.
 * Yeni version eklenir (max(version)+1) — geçmiş zinciri korunur.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ key: string; locale: string; id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { key, locale, id } = await params;
  if (!isSupportedLegalKey(key) || !isSupportedLegalLocale(locale))
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });

  const adminId = (admin.id ?? admin.userId ?? null) as string | null;

  const target = await prisma.legalDocumentRevision.findUnique({
    where: { id },
    select: {
      id: true,
      documentKey: true,
      locale: true,
      title: true,
      content: true,
      isActive: true,
      effectiveAt: true,
    },
  });
  if (!target) return ApiErrors.notFound();
  if (target.documentKey !== key || target.locale !== locale)
    return NextResponse.json({ error: 'mismatch' }, { status: 400 });

  const existing = await prisma.legalDocument.findUnique({
    where: { key_locale: { key, locale } },
    select: { version: true },
  });
  const nextVersion = (existing?.version ?? 0) + 1;

  const upserted = await prisma.$transaction(async (tx) => {
    const row = await tx.legalDocument.upsert({
      where: { key_locale: { key, locale } },
      create: {
        key,
        locale,
        title: target.title,
        content: target.content,
        version: 1,
        isActive: target.isActive,
        effectiveAt: target.effectiveAt,
        updatedById: adminId,
      },
      update: {
        title: target.title,
        content: target.content,
        version: nextVersion,
        isActive: target.isActive,
        effectiveAt: target.effectiveAt,
        updatedById: adminId,
      },
    });
    await tx.legalDocumentRevision.create({
      data: {
        documentId: row.id,
        documentKey: key,
        locale,
        version: row.version,
        editType: 'reverted',
        title: row.title,
        content: row.content,
        isActive: row.isActive,
        effectiveAt: row.effectiveAt,
        editedById: adminId,
      },
    });
    return row;
  });

  invalidateLegalDocumentCache(key, locale);
  // Stage 83 §38.163 — flush ISR cache after revert (CLAUDE.md §38.163).
  revalidateLegalDocument(key);

  return NextResponse.json({
    ok: true,
    doc: {
      id: upserted.id,
      key: upserted.key,
      locale: upserted.locale,
      version: upserted.version,
      title: upserted.title,
    },
  });
}
