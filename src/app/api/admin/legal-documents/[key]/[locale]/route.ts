import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import {
  isSupportedLegalKey,
  isSupportedLegalLocale,
  LEGAL_DOCUMENT_DESCRIPTIONS,
} from '@/lib/legal/keys';
import { LEGAL_TEMPLATE_DEFAULTS } from '@/lib/legal/templates';
import { invalidateLegalDocumentCache } from '@/lib/legal/loader';

export const dynamic = 'force-dynamic';

const MAX_TITLE = 200;
const MAX_CONTENT = 80_000;
const MAX_DESCRIPTION = 1_000;

function parseParams(rawKey: string, rawLocale: string) {
  if (!isSupportedLegalKey(rawKey)) return { error: 'invalid_key' as const };
  if (!isSupportedLegalLocale(rawLocale)) return { error: 'invalid_locale' as const };
  return { key: rawKey, locale: rawLocale };
}

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

  const row = await prisma.legalDocument.findUnique({
    where: { key_locale: { key: parsed.key, locale: parsed.locale } },
    select: {
      id: true,
      key: true,
      locale: true,
      title: true,
      content: true,
      description: true,
      version: true,
      isActive: true,
      effectiveAt: true,
      updatedAt: true,
      createdAt: true,
      updatedById: true,
    },
  });

  if (!row) {
    const def = LEGAL_TEMPLATE_DEFAULTS[parsed.key][parsed.locale];
    return NextResponse.json({
      doc: null,
      defaults: {
        key: parsed.key,
        locale: parsed.locale,
        title: def.title,
        content: def.content,
        description: LEGAL_DOCUMENT_DESCRIPTIONS[parsed.key][parsed.locale],
      },
    });
  }

  return NextResponse.json({
    doc: {
      id: row.id,
      key: row.key,
      locale: row.locale,
      title: row.title,
      content: row.content,
      description: row.description,
      version: row.version,
      isActive: row.isActive,
      effectiveAt: row.effectiveAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedById: row.updatedById,
    },
  });
}

interface PatchBody {
  title?: string;
  content?: string;
  description?: string | null;
  isActive?: boolean;
  effectiveAt?: string | null;
}

/**
 * Upsert + revision write tek transaction (MailTemplate Phase 5 pattern).
 * Yeni satırsa version=1, mevcut satırsa version+1. editType create/update
 * upsert sonrası createdAt===updatedAt türetilir.
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

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return ApiErrors.badRequest('invalid_json');
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const description =
    body.description === null
      ? null
      : typeof body.description === 'string'
        ? body.description.trim()
        : undefined;
  const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;
  let effectiveAt: Date | null | undefined;
  if (body.effectiveAt === null) effectiveAt = null;
  else if (typeof body.effectiveAt === 'string') {
    const d = new Date(body.effectiveAt);
    effectiveAt = isNaN(d.getTime()) ? undefined : d;
  } else effectiveAt = undefined;

  if (title.length === 0)
    return NextResponse.json(
      { error: 'invalid_field', field: 'title', reason: 'required' },
      { status: 400 },
    );
  if (title.length > MAX_TITLE)
    return NextResponse.json(
      { error: 'invalid_field', field: 'title', reason: 'too_long', max: MAX_TITLE },
      { status: 400 },
    );
  if (content.length === 0)
    return NextResponse.json(
      { error: 'invalid_field', field: 'content', reason: 'required' },
      { status: 400 },
    );
  if (content.length > MAX_CONTENT)
    return NextResponse.json(
      { error: 'invalid_field', field: 'content', reason: 'too_long', max: MAX_CONTENT },
      { status: 400 },
    );
  if (description && description.length > MAX_DESCRIPTION)
    return NextResponse.json(
      {
        error: 'invalid_field',
        field: 'description',
        reason: 'too_long',
        max: MAX_DESCRIPTION,
      },
      { status: 400 },
    );

  const adminId = (admin.id ?? admin.userId ?? null) as string | null;

  // Existing version → +1, yoksa 1
  const existing = await prisma.legalDocument.findUnique({
    where: { key_locale: { key: parsed.key, locale: parsed.locale } },
    select: { id: true, version: true },
  });
  const nextVersion = (existing?.version ?? 0) + 1;
  const finalDescription =
    description === undefined
      ? (existing
          ? undefined
          : LEGAL_DOCUMENT_DESCRIPTIONS[parsed.key][parsed.locale])
      : description;

  const finalEffectiveAt =
    effectiveAt === undefined ? (existing ? undefined : new Date()) : effectiveAt;

  const upserted = await prisma.$transaction(async (tx) => {
    const row = await tx.legalDocument.upsert({
      where: { key_locale: { key: parsed.key, locale: parsed.locale } },
      create: {
        key: parsed.key,
        locale: parsed.locale,
        title,
        content,
        description: finalDescription ?? null,
        version: 1,
        isActive,
        effectiveAt: finalEffectiveAt ?? new Date(),
        updatedById: adminId,
      },
      update: {
        title,
        content,
        ...(finalDescription !== undefined ? { description: finalDescription } : {}),
        version: nextVersion,
        isActive,
        ...(finalEffectiveAt !== undefined ? { effectiveAt: finalEffectiveAt } : {}),
        updatedById: adminId,
      },
    });
    const editType: 'created' | 'updated' =
      row.createdAt.getTime() === row.updatedAt.getTime() ? 'created' : 'updated';
    await tx.legalDocumentRevision.create({
      data: {
        documentId: row.id,
        documentKey: parsed.key,
        locale: parsed.locale,
        version: row.version,
        editType,
        title: row.title,
        content: row.content,
        isActive: row.isActive,
        effectiveAt: row.effectiveAt,
        editedById: adminId,
      },
    });
    return row;
  });

  // Soft-prune (last 50 per (key, locale)) — best effort outside tx
  pruneRevisionsBackground(parsed.key, parsed.locale).catch(() => undefined);

  invalidateLegalDocumentCache(parsed.key, parsed.locale);

  return NextResponse.json({
    ok: true,
    doc: {
      id: upserted.id,
      key: upserted.key,
      locale: upserted.locale,
      title: upserted.title,
      content: upserted.content,
      description: upserted.description,
      version: upserted.version,
      isActive: upserted.isActive,
      effectiveAt: upserted.effectiveAt?.toISOString() ?? null,
      updatedAt: upserted.updatedAt.toISOString(),
    },
  });
}

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

  const adminId = (admin.id ?? admin.userId ?? null) as string | null;
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.legalDocument.findUnique({
        where: { key_locale: { key: parsed.key, locale: parsed.locale } },
        select: { id: true, version: true, title: true, content: true, isActive: true, effectiveAt: true },
      });
      if (!existing) {
        throw Object.assign(new Error('not_found'), { code: 'P2025' });
      }
      await tx.legalDocument.delete({
        where: { key_locale: { key: parsed.key, locale: parsed.locale } },
      });
      await tx.legalDocumentRevision.create({
        data: {
          documentKey: parsed.key,
          locale: parsed.locale,
          version: existing.version,
          editType: 'deleted',
          title: existing.title,
          content: existing.content,
          isActive: existing.isActive,
          effectiveAt: existing.effectiveAt,
          editedById: adminId,
        },
      });
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P2025') return ApiErrors.notFound();
    throw err;
  }
  pruneRevisionsBackground(parsed.key, parsed.locale).catch(() => undefined);
  invalidateLegalDocumentCache(parsed.key, parsed.locale);
  return NextResponse.json({ ok: true });
}

const PRUNE_KEEP = 50;

async function pruneRevisionsBackground(documentKey: string, locale: string) {
  const keep = await prisma.legalDocumentRevision.findMany({
    where: { documentKey, locale },
    orderBy: { createdAt: 'desc' },
    take: PRUNE_KEEP,
    select: { id: true },
  });
  if (keep.length < PRUNE_KEEP) return;
  const keepIds = keep.map((r) => r.id);
  await prisma.legalDocumentRevision.deleteMany({
    where: { documentKey, locale, id: { notIn: keepIds } },
  });
}
