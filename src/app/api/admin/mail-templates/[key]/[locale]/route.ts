import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { invalidateMailCopyCache, isSupportedMailTemplateKey, type MailLocale } from '@/lib/email/copy-loader';
import { stripLockedFields } from '@/lib/email/locked-fields';
import { MAIL_PLACEHOLDERS, findInvalidPlaceholders } from '@/lib/email/placeholders';
import { pruneRevisions } from '@/lib/email/revisions';
import { findInvalidField } from '@/lib/email/field-validation';
import { LIFECYCLE_INLINE_DEFAULTS } from '@/lib/email/templates/lifecycle-defaults';

export const dynamic = 'force-dynamic';

const SUPPORTED_LOCALES = new Set(['tr', 'en']);

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
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { key: rawKey, locale: rawLocale } = await params;
  const parsed = parseParams(rawKey, rawLocale);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const row = await prisma.mailTemplate.findUnique({
    where: { key_locale: { key: parsed.key, locale: parsed.locale } },
    // Explicit select — drift-resilient (CLAUDE.md §14.1).
    select: {
      id: true,
      key: true,
      locale: true,
      content: true,
      editable: true,
      updatedById: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  // Lifecycle templates (CLAUDE.md §38.43): SEEDS array bunları `content: {}`
  // ile seedler — DB'de row olabilir ama içerik boş. Editor input'lar boş
  // kalmasın diye GET response'unda inline default'ı fallback olarak merge
  // ediyoruz. Diğer 12 template DB'de dolu seed'lendi, fallback uygulanmaz.
  // `inlineDefault` seed seviyesindeki kanonik kaynak (lifecycle-defaults.ts);
  // render fn'leri de aynı obj'yi import ediyor → drift sıfır.
  const inlineDefault: Record<string, string> | null =
    LIFECYCLE_INLINE_DEFAULTS[parsed.key]?.[parsed.locale] ?? null;

  if (!row) {
    // Row hiç yoksa: lifecycle template ise inline default'ı dön; eski 12
    // template (welcome/newsletter/...) seed çalıştırılmamışsa hâlâ 404 —
    // operatör manuel `npx tsx scripts/seed-mail-templates.ts` çalıştırmalı.
    if (inlineDefault) {
      return NextResponse.json({
        template: {
          id: null,
          key: parsed.key,
          locale: parsed.locale,
          content: inlineDefault,
          editable: true,
          updatedById: null,
          updatedAt: null,
          createdAt: null,
          isInlineDefault: true,
        },
      });
    }
    return NextResponse.json({ error: 'not_seeded' }, { status: 404 });
  }

  // Row var. Content boş object ise (lifecycle empty seed) inline default'ı
  // merge et. Spread sırası: önce default, sonra DB → admin override DB
  // değerlerini korur, eksik field'lara default doldurulur.
  const dbContent =
    row.content && typeof row.content === 'object' && !Array.isArray(row.content)
      ? (row.content as Record<string, unknown>)
      : {};
  const dbHasContent = Object.keys(dbContent).length > 0;
  const finalContent = inlineDefault && !dbHasContent
    ? inlineDefault
    : inlineDefault
    ? { ...inlineDefault, ...dbContent }
    : dbContent;

  return NextResponse.json({
    template: {
      id: row.id,
      key: row.key,
      locale: row.locale,
      content: finalContent,
      editable: row.editable,
      updatedById: row.updatedById,
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      isInlineDefault: !!inlineDefault && !dbHasContent,
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
  const admin = await getAdminFromRequest(req);
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

  // Phase 6: per-field length validation. Catches admin paste-bombs that
  // would break layout (300-char eyebrow) or trigger spam filters
  // (subject ≥ 100 chars).
  const fieldError = findInvalidField(cleaned);
  if (fieldError) {
    return NextResponse.json(
      {
        error: 'invalid_field_length',
        field: fieldError.field,
        reason: fieldError.reason,
        max: fieldError.max,
        min: fieldError.min,
        actual: fieldError.actual,
      },
      { status: 400 },
    );
  }

  // Server-side enforcement of KVKK / security locks. Locked fields are
  // stripped from the payload regardless of UI gating — defence in depth
  // against curl bypass and stale UI states. See locked-fields.ts.
  const safeCleaned = stripLockedFields(parsed.key, cleaned);

  const adminIdRaw = admin.id ?? admin.userId ?? null;
  const adminId = typeof adminIdRaw === 'string' ? adminIdRaw : null;
  const contentJson = safeCleaned as Prisma.InputJsonValue;

  // Phase 5 — upsert + revision write in a single transaction so the
  // audit log can never drift from the live row when one of the writes
  // fails midway. editType is derived from upsert timestamps (atomic at
  // DB level): if createdAt === updatedAt this row was just created;
  // otherwise it was an update. This avoids the find-then-upsert TOCTOU
  // race where two concurrent saves could both write 'created'.
  const [upserted] = await prisma.$transaction(async (tx) => {
    const row = await tx.mailTemplate.upsert({
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
    const editType: 'created' | 'updated' =
      row.createdAt.getTime() === row.updatedAt.getTime() ? 'created' : 'updated';
    await tx.mailTemplateRevision.create({
      data: {
        templateId: row.id,
        templateKey: parsed.key,
        locale: parsed.locale,
        editType,
        content: contentJson,
        editedById: adminId,
      },
    });
    return [row] as const;
  });

  // Soft-prune outside the transaction: best-effort cleanup, doesn't need
  // to atomically commit with the write. Tiny race if two concurrent
  // saves both compute keepIds is acceptable — eventually consistent.
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
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { key: rawKey, locale: rawLocale } = await params;
  const parsed = parseParams(rawKey, rawLocale);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // Phase 5 — delete + 'deleted' revision in a single transaction so we
  // never end up with an audit row claiming "deleted" for a template
  // that's still alive (or vice versa). Schema's `onDelete: SetNull` on
  // revisions keeps the audit row reachable via (templateKey, locale)
  // after the template row is gone — revert can re-create from history.
  const adminIdRaw = admin.id ?? admin.userId ?? null;
  const adminId = typeof adminIdRaw === 'string' ? adminIdRaw : null;
  try {
    await prisma.$transaction(async (tx) => {
      // Delete first so a missing row throws P2025 before we insert the
      // audit row — guards against orphan 'deleted' revisions.
      await tx.mailTemplate.delete({
        where: { key_locale: { key: parsed.key, locale: parsed.locale } },
      });
      await tx.mailTemplateRevision.create({
        data: {
          templateKey: parsed.key,
          locale: parsed.locale,
          editType: 'deleted',
          content: {} as Prisma.InputJsonValue,
          editedById: adminId,
        },
      });
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
