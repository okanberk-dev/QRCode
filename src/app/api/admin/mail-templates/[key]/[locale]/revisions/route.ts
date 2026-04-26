import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { isSupportedMailTemplateKey } from '@/lib/email/copy-loader';

export const dynamic = 'force-dynamic';

const SUPPORTED_LOCALES = new Set(['tr', 'en']);

/**
 * Phase 5 — list revision history for a (key, locale). Up to 50 most
 * recent rows (matches the prune threshold). Each entry includes the
 * editor's username (joined via AdminUser) so the UI can show "edited
 * by ahmet 12 dk önce" without an extra round trip.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string; locale: string }> },
) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { key: rawKey, locale: rawLocale } = await params;
  if (!isSupportedMailTemplateKey(rawKey)) {
    return NextResponse.json({ error: 'invalid_key' }, { status: 400 });
  }
  if (!SUPPORTED_LOCALES.has(rawLocale)) {
    return NextResponse.json({ error: 'invalid_locale' }, { status: 400 });
  }

  const rows = await prisma.mailTemplateRevision.findMany({
    where: { templateKey: rawKey, locale: rawLocale },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Resolve editor usernames in a single query — admin user ids are unique
  // strings, so a single `IN` lookup is cheaper than per-row joins.
  const editorIds = [...new Set(rows.map((r) => r.editedById).filter((id): id is string => Boolean(id)))];
  const editors = editorIds.length
    ? await prisma.adminUser.findMany({
        where: { id: { in: editorIds } },
        select: { id: true, username: true, email: true },
      })
    : [];
  const editorById = new Map(editors.map((e) => [e.id, e]));

  return NextResponse.json({
    revisions: rows.map((r) => ({
      id: r.id,
      editType: r.editType,
      content: r.content,
      editedById: r.editedById,
      editor: r.editedById ? editorById.get(r.editedById) ?? null : null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
