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
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { key: rawKey, locale: rawLocale } = await params;
  if (!isSupportedMailTemplateKey(rawKey)) {
    return NextResponse.json({ error: 'invalid_key' }, { status: 400 });
  }
  if (!SUPPORTED_LOCALES.has(rawLocale)) {
    return NextResponse.json({ error: 'invalid_locale' }, { status: 400 });
  }

  // Wrap DB calls so an underlying Prisma error (table missing, conn
  // refused, schema drift) returns structured JSON 500 instead of
  // Next.js's default empty-body 500 — client `await res.json()`
  // crashed with "Unexpected end of JSON input" before this guard.
  try {
    const rows = await prisma.mailTemplateRevision.findMany({
      where: { templateKey: rawKey, locale: rawLocale },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Resolve editor usernames in a single query — admin user ids are
    // unique strings, so a single `IN` lookup is cheaper than per-row
    // joins. NOTE: AdminUser has no `email` field; the UI just shows
    // `username` so a stale `select: { email: true }` would crash with
    // "Unknown field email" at runtime.
    const editorIds = [...new Set(rows.map((r) => r.editedById).filter((id): id is string => Boolean(id)))];
    const editors = editorIds.length
      ? await prisma.adminUser.findMany({
          where: { id: { in: editorIds } },
          select: { id: true, username: true },
        })
      : [];
    const editorById = new Map(editors.map((e) => [e.id, e]));

    return NextResponse.json({
      revisions: rows.map((r) => {
        const editor = r.editedById ? editorById.get(r.editedById) ?? null : null;
        return {
          id: r.id,
          editType: r.editType,
          content: r.content,
          editedById: r.editedById,
          // Backward-compatible shape for the UI, but `email` is null
          // since AdminUser doesn't store one. UI gracefully falls
          // through to `username` (see MailRevisionHistory).
          editor: editor ? { id: editor.id, username: editor.username, email: null } : null,
          createdAt: r.createdAt.toISOString(),
        };
      }),
    });
  } catch (err) {
    console.error('[revisions:GET] unhandled error:', err);
    const message = err instanceof Error ? err.message : 'unknown error';
    // Common cause: `mail_template_revisions` table missing. Hint
    // operator about the most likely fix without leaking stack trace.
    const hint = /mail_template_revisions|MailTemplateRevision/.test(message)
      ? 'Tablo eksik olabilir → Vercel build script `prisma db push --accept-data-loss` koştu mu kontrol et.'
      : 'Vercel Function Logs → tam stack trace.';
    return NextResponse.json(
      { error: 'server_error', detail: message, hint },
      { status: 500 },
    );
  }
}
