import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { isSupportedLegalKey, isSupportedLegalLocale } from '@/lib/legal/keys';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string; locale: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { key, locale } = await params;
  if (!isSupportedLegalKey(key) || !isSupportedLegalLocale(locale)) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  const rows = await prisma.legalDocumentRevision.findMany({
    where: { documentKey: key, locale },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      version: true,
      editType: true,
      title: true,
      isActive: true,
      effectiveAt: true,
      editedById: true,
      createdAt: true,
    },
  });

  // Editor isim/email doldurma (best-effort)
  const editorIds = Array.from(new Set(rows.map((r) => r.editedById).filter((x): x is string => !!x)));
  let editors: Record<string, { username: string; email: string | null }> = {};
  if (editorIds.length > 0) {
    const adminRows = await prisma.adminUser.findMany({
      where: { id: { in: editorIds } },
      select: { id: true, username: true, email: true },
    });
    editors = Object.fromEntries(adminRows.map((a) => [a.id, { username: a.username, email: a.email }]));
  }

  return NextResponse.json({
    revisions: rows.map((r) => ({
      id: r.id,
      version: r.version,
      editType: r.editType,
      title: r.title,
      isActive: r.isActive,
      effectiveAt: r.effectiveAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      editor: r.editedById ? editors[r.editedById] ?? null : null,
    })),
  });
}
