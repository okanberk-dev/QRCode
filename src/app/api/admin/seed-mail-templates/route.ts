import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { invalidateMailCopyCache, isSupportedMailTemplateKey, type MailLocale } from '@/lib/email/copy-loader';
import { MAIL_TEMPLATE_SEEDS } from '@/lib/email/seed-data';
import { pruneRevisions } from '@/lib/email/revisions';

export const dynamic = 'force-dynamic';

/**
 * Phase 9 — admin endpoint to seed mail-template default copy from the
 * panel. Two modes:
 *   - `missing` (default, safe): only insert rows that don't exist yet.
 *     Existing rows — including admin-edited content — are left
 *     untouched. Use after deploying a new template that hasn't been
 *     seeded into the live DB.
 *   - `force` (destructive): upsert every row, overwriting admin
 *     edits with the code default. Used to "reset all to baseline".
 *     Phase 5 audit log captures every overwrite as a 'created' or
 *     'updated' revision so the lost content stays recoverable via
 *     "Bu sürüme dön".
 *
 * Rate-limited 5/hour/admin so a stuck button can't bomb the DB.
 */
export async function POST(req: NextRequest) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const adminId = admin.id ?? admin.userId ?? 'unknown';
  const limit = rateLimit(`mail-seed:${adminId}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  let body: { mode?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is fine — defaults to 'missing'.
  }
  const mode = body.mode === 'force' ? 'force' : 'missing';

  // Pull existing (key, locale) pairs in one query so we don't round-trip
  // the DB once per seed row. 18 rows × 2 queries = 36 round-trips on
  // serverless cold start would be slow.
  const existing = await prisma.mailTemplate.findMany({
    select: { key: true, locale: true },
  });
  const existingSet = new Set(existing.map((e) => `${e.key}:${e.locale}`));

  type Result = {
    key: string;
    locale: string;
    action: 'inserted' | 'skipped' | 'overwritten';
  };
  const results: Result[] = [];
  const editedKeys = new Set<string>();

  for (const row of MAIL_TEMPLATE_SEEDS) {
    const isExisting = existingSet.has(`${row.key}:${row.locale}`);

    if (mode === 'missing' && isExisting) {
      results.push({ key: row.key, locale: row.locale, action: 'skipped' });
      continue;
    }

    const contentJson = row.content as Prisma.InputJsonValue;
    const editType: 'created' | 'updated' = isExisting ? 'updated' : 'created';

    // Match the PATCH endpoint's pattern (Phase 5): upsert + revision in
    // a single transaction so the audit log can never drift from the
    // live row when one of the writes fails midway.
    await prisma.$transaction(async (tx) => {
      const upserted = await tx.mailTemplate.upsert({
        where: { key_locale: { key: row.key, locale: row.locale } },
        create: {
          key: row.key,
          locale: row.locale,
          content: contentJson,
          updatedById: adminId,
        },
        update: {
          content: contentJson,
          updatedById: adminId,
        },
      });
      await tx.mailTemplateRevision.create({
        data: {
          templateId: upserted.id,
          templateKey: row.key,
          locale: row.locale,
          editType,
          content: contentJson,
          editedById: adminId,
        },
      });
    });

    editedKeys.add(`${row.key}:${row.locale}`);
    results.push({
      key: row.key,
      locale: row.locale,
      action: isExisting ? 'overwritten' : 'inserted',
    });
  }

  // Prune + cache bust per affected (key, locale). Outside the per-row
  // transaction since the prune is best-effort cleanup, not atomic with
  // the write.
  for (const k of editedKeys) {
    const [key, locale] = k.split(':');
    await pruneRevisions(key, locale);
    if (isSupportedMailTemplateKey(key)) {
      invalidateMailCopyCache(key, locale as MailLocale);
    }
  }

  const counts = {
    inserted: results.filter((r) => r.action === 'inserted').length,
    overwritten: results.filter((r) => r.action === 'overwritten').length,
    skipped: results.filter((r) => r.action === 'skipped').length,
    total: results.length,
  };

  return NextResponse.json({
    ok: true,
    mode,
    counts,
    results,
  });
}
