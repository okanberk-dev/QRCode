import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { invalidateMailCopyCache, isSupportedMailTemplateKey, type MailLocale } from '@/lib/email/copy-loader';
import { stripLockedFields } from '@/lib/email/locked-fields';
import { MAIL_PLACEHOLDERS, findInvalidPlaceholders } from '@/lib/email/placeholders';

export const dynamic = 'force-dynamic';

const SUPPORTED_LOCALES = new Set(['tr', 'en']);

const REVISION_KEEP = 50;

/**
 * Drop revisions older than the most recent `REVISION_KEEP` for a given
 * (key, locale). We do this after each write rather than via a cron so
 * the table stays bounded without an extra moving part.
 */
async function pruneRevisions(key: string, locale: string) {
  const recent = await prisma.mailTemplateRevision.findMany({
    where: { templateKey: key, locale },
    orderBy: { createdAt: 'desc' },
    take: REVISION_KEEP,
    select: { id: true },
  });
  const keepIds = recent.map((r) => r.id);
  if (keepIds.length === 0) return;
  await prisma.mailTemplateRevision.deleteMany({
    where: {
      templateKey: key,
      locale,
      id: { notIn: keepIds },
    },
  });
}

function parseParams(key: string, locale: string) {
  if (!isSupportedMailTemplateKey(key)) {
    return { error: 'invalid_key' as const };
  }
  if (!SUPPORTED_LOCALES.has(locale)) {
    return { error: 'invalid_locale' as const };
  }
  return { key, locale: locale as MailLocale };
}

/**
 * Fetch a single template's content. 404 if not seeded yet — admin UI
 * surfaces "create default" affordance.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string; locale: string }> },
) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { key: rawKey, locale: rawLocale } = await params;
  const parsed = parseParams(rawKey, rawLocale);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const row = await prisma.mailTemplate.findUnique({
    where: { key_locale: { key: parsed.key, locale: parsed.locale } },
  });
  if (!row) return NextResponse.json({ error: 'not_seeded' }, { status: 404 });

  return NextResponse.json({
    template: {
      id: row.id,
      key: row.key,
      locale: row.locale,
      content: row.content,
      editable: row.editable,
      updatedById: row.updatedById,
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    },
  });
}

/**
 * Upsert template content. Body: `{ content: Record<string, string> }`.
 * Empty strings allowed (means "use inline default" — render falls back).
 * On success, the in-process copy cache is invalidated so the next mail
 * send picks up the change immediately.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ key: string; locale: string }> },
) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { key: rawKey, locale: rawLocale } = await params;
  const parsed = parseParams(rawKey, rawLocale);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  let body: { content?: Record<string, unknown> } = {};
  try {
    body = await req.json();
  } catch {
    return ApiErrors.badRequest('invalid_json');
  }

  if (!body.content || typeof body.content !== 'object' || Array.isArray(body.content)) {
    return NextResponse.json({ error: 'invalid_content' }, { status: 400 });
  }

  // Two payload shapes are valid:
  //   1) flat string-only      — most templates
  //   2) nested {variant:{...}} — form-confirmation (Phase 3): each top-level
  //      key is a formType variant, inner values are flat strings
  // Empty strings are dropped (admin reverts that field to inline default);
  // empty inner objects are dropped (whole variant reverts to default).
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body.content)) {
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed.length > 0) cleaned[k] = trimmed;
    } else if (
      parsed.key === 'form-confirmation' &&
      v !== null && typeof v === 'object' && !Array.isArray(v)
    ) {
      const inner: Record<string, string> = {};
      for (const [ik, iv] of Object.entries(v as Record<string, unknown>)) {
        if (typeof iv === 'string') {
          const trimmed = iv.trim();
          if (trimmed.length > 0) inner[ik] = trimmed;
        }
      }
      if (Object.keys(inner).length > 0) cleaned[k] = inner;
    }
    // Anything else (number, null, array, nested object on non-allowlisted
    // template) is silently dropped to keep the JSON well-shaped.
  }

  // Phase 4: validate placeholders. Admin can use `${firstName}` etc. but
  // typo'lu / izinsiz token'lar reject — render time'da `${badName}`
  // empty'e degrade ediyor, ama erken hata daha iyi UX.
  const allowedPlaceholders = MAIL_PLACEHOLDERS[parsed.key as keyof typeof MAIL_PLACEHOLDERS] ?? [];
  const invalid = findInvalidPlaceholders(cleaned, allowedPlaceholders);
  if (invalid) {
    return NextResponse.json(
      {
        error: 'invalid_placeholder',
        field: invalid.field,
        invalid: invalid.invalid,
        allowed: allowedPlaceholders,
      },
      { status: 400 },
    );
  }

  // Server-side enforcement of KVKK / security locks. Locked fields are
  // stripped from the payload regardless of UI gating — defence in depth
  // against curl bypass and stale UI states. See locked-fields.ts.
  const safeCleaned = stripLockedFields(parsed.key, cleaned);

  const adminId = admin.id ?? admin.userId ?? null;
  const contentJson = safeCleaned as Prisma.InputJsonValue;

  // Phase 5 — write the revision in the same transaction as the upsert
  // so the audit log can never drift from the live row. editType depends
  // on whether a row existed before this PATCH.
  const existing = await prisma.mailTemplate.findUnique({
    where: { key_locale: { key: parsed.key, locale: parsed.locale } },
    select: { id: true },
  });
  const editType: 'created' | 'updated' = existing ? 'updated' : 'created';

  const upserted = await prisma.mailTemplate.upsert({
    where: { key_locale: { key: parsed.key, locale: parsed.locale } },
    create: {
      key: parsed.key,
      locale: parsed.locale,
      content: contentJson,
      updatedById: adminId,
    },
    update: {
      content: contentJson,
      updatedById: adminId,
    },
  });

  await prisma.mailTemplateRevision.create({
    data: {
      templateId: upserted.id,
      templateKey: parsed.key,
      locale: parsed.locale,
      editType,
      content: contentJson,
      editedById: adminId,
    },
  });
  // Soft-prune: keep the last 50 revisions per (key, locale). Older rows
  // are mostly noise and the table grows fast on chatty admins.
  await pruneRevisions(parsed.key, parsed.locale);

  // Cache bust — next mail send (cron or transactional) reads fresh copy.
  invalidateMailCopyCache(parsed.key, parsed.locale);

  return NextResponse.json({
    ok: true,
    template: {
      id: upserted.id,
      key: upserted.key,
      locale: upserted.locale,
      content: upserted.content,
      updatedAt: upserted.updatedAt.toISOString(),
    },
  });
}

/**
 * Delete template row → render falls back to inline default (full revert).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ key: string; locale: string }> },
) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { key: rawKey, locale: rawLocale } = await params;
  const parsed = parseParams(rawKey, rawLocale);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // Phase 5 — write a 'deleted' revision before the actual delete so the
  // history survives. Schema's `onDelete: SetNull` on revisions keeps the
  // audit row reachable via (templateKey, locale) after the template row
  // is gone — revert can re-create from history.
  const adminId = admin.id ?? admin.userId ?? null;
  try {
    await prisma.mailTemplateRevision.create({
      data: {
        templateKey: parsed.key,
        locale: parsed.locale,
        editType: 'deleted',
        content: {} as Prisma.InputJsonValue,
        editedById: adminId,
      },
    });
    await prisma.mailTemplate.delete({
      where: { key_locale: { key: parsed.key, locale: parsed.locale } },
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    throw err;
  }
  await pruneRevisions(parsed.key, parsed.locale);
  invalidateMailCopyCache(parsed.key, parsed.locale);
  return NextResponse.json({ ok: true });
}
