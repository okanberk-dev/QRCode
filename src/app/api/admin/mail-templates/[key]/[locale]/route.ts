import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { invalidateMailCopyCache, isSupportedMailTemplateKey, type MailLocale } from '@/lib/email/copy-loader';

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

  // Drop empty strings — means admin wants to revert that field to inline
  // default. Storing "" would override the default and render as blank.
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body.content)) {
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed.length > 0) cleaned[k] = trimmed;
    } else if (v !== null && v !== undefined) {
      cleaned[k] = v;
    }
  }

  const adminId = admin.id ?? admin.userId ?? null;

  const contentJson = cleaned as Prisma.InputJsonValue;
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

  try {
    await prisma.mailTemplate.delete({
      where: { key_locale: { key: parsed.key, locale: parsed.locale } },
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    throw err;
  }
  invalidateMailCopyCache(parsed.key, parsed.locale);
  return NextResponse.json({ ok: true });
}
