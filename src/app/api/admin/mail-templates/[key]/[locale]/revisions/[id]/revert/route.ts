import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import {
  invalidateMailCopyCache,
  isSupportedMailTemplateKey,
  type MailLocale,
} from '@/lib/email/copy-loader';
import { stripLockedFields } from '@/lib/email/locked-fields';
import { pruneRevisions } from '@/lib/email/revisions';

export const dynamic = 'force-dynamic';

const SUPPORTED_LOCALES = new Set(['tr', 'en']);

/**
 * Phase 5 — revert the live MailTemplate to a historical revision's
 * content. Writes a new 'reverted' revision so the timeline reads
 * forward (no lossy back-pointer needed). If the revision is itself a
 * 'deleted' marker (empty content), revert applies an empty object,
 * which the loader treats as "fall back to inline default" — same
 * effect as DELETE.
 *
 * Locked fields are stripped on apply: a revision saved before a field
 * became locked stays in history, but cannot be reactivated through
 * revert. Defence in depth.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ key: string; locale: string; id: string }> },
) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { key: rawKey, locale: rawLocale, id: revisionId } = await params;
  if (!isSupportedMailTemplateKey(rawKey)) {
    return NextResponse.json({ error: 'invalid_key' }, { status: 400 });
  }
  if (!SUPPORTED_LOCALES.has(rawLocale)) {
    return NextResponse.json({ error: 'invalid_locale' }, { status: 400 });
  }
  const locale = rawLocale as MailLocale;

  const revision = await prisma.mailTemplateRevision.findUnique({
    where: { id: revisionId },
  });
  if (!revision) {
    return NextResponse.json({ error: 'revision_not_found' }, { status: 404 });
  }
  // Guard against cross-template revert (id is global cuid, but pathing is
  // scoped by key+locale — a UI bug shouldn't be able to revert template A
  // to template B's content).
  if (revision.templateKey !== rawKey || revision.locale !== rawLocale) {
    return NextResponse.json({ error: 'revision_mismatch' }, { status: 400 });
  }

  const adminId = admin.id ?? admin.userId ?? null;
  // Strip any locked fields that may have been allowed by a prior schema.
  const rawContent = (revision.content ?? {}) as Record<string, unknown>;
  const safeContent = stripLockedFields(rawKey, rawContent) as Prisma.InputJsonValue;

  // Upsert + 'reverted' revision atomically so the audit log can never
  // claim a revert that didn't actually apply (or vice versa).
  const [upserted] = await prisma.$transaction(async (tx) => {
    const row = await tx.mailTemplate.upsert({
      where: { key_locale: { key: rawKey, locale: rawLocale } },
      create: {
        key: rawKey,
        locale: rawLocale,
        content: safeContent,
        updatedById: adminId,
      },
      update: {
        content: safeContent,
        updatedById: adminId,
      },
    });
    await tx.mailTemplateRevision.create({
      data: {
        templateId: row.id,
        templateKey: rawKey,
        locale: rawLocale,
        editType: 'reverted',
        content: safeContent,
        editedById: adminId,
      },
    });
    return [row] as const;
  });

  // Match PATCH / DELETE so the table stays bounded even if revert is
  // the most-used path.
  await pruneRevisions(rawKey, rawLocale);
  invalidateMailCopyCache(rawKey, locale);

  return NextResponse.json({
    ok: true,
    template: {
      id: upserted.id,
      key: upserted.key,
      locale: upserted.locale,
      content: upserted.content,
      updatedAt: upserted.updatedAt.toISOString(),
    },
    revertedFrom: revisionId,
  });
}
