// CLAUDE.md §42 — Admin Denetim Merkezi seed trigger (superadmin).
//
// Mevcut `src/lib/audits/seed-runner.ts` `runAuditSeed()` helper'ını admin
// panelden tek tıkla tetikler. Self-fetch antipattern (CLAUDE.md §21.13)
// yok — helper doğrudan invoke ediliyor. Rate limit 5/dk/actor (CLAUDE.md
// §28.4 bulk endpoint paterni).
//
// Idempotent: kategoriler `upsert by slug`, şablonlar `findFirst (title,
// createdBy='seed') + update or create + replace questions`. Admin
// edit'leri title değişikliği yaptıysa korunur (yeni seed satırı ayrı
// row açar, "code default'larına dön" semantiği — CLAUDE.md §21.26).

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { runAuditSeed } from '@/lib/audits/seed-runner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const limit = await rateLimit(`admin-audit-seed:${admin.id}`, 5, 60_000);
  if (!limit.allowed) {
    return ApiErrors.tooManyRequests();
  }

  try {
    const result = await runAuditSeed();
    return NextResponse.json({ data: result });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'admin.audits.seed' } });
    return ApiErrors.internalError('Seed çalıştırılamadı');
  }
}
